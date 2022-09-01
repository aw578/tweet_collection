function parsePIDate(date) {
  var day = (parseInt(Utilities.formatDate(date, "EST", "u"), 10) + 4) % 7
  var hour = parseInt(Utilities.formatDate(date, "EST", "HH"), 10)
  var minute = parseInt(Utilities.formatDate(date, "EST", "mm"), 10)
  var time = 0 + (60 * hour) + minute
  if (day === 0 && hour < 12) {
    day = 7
    time += 1440 * 7
  }
  else {
    time += 1440 * (day)
  }
  return [time, day, hour, minute]
}

function parseBins(contracts) {
  var list = []
  for (var i in contracts) {
    var lastTradePrice = contracts[i]['lastTradePrice']
    if (lastTradePrice === 0) {
      lastTradePrice = contracts[i]['bestBuyYesCost']
    }
    list.push(lastTradePrice)
    var bin = contracts[i]['shortName'].replace(/\D/g, '')
    bin = bin.substring(bin.length - 3, bin.length)
    list.push(bin)
  }
  return list;
}

// sample date: 'Sun Feb 02 23:56:28 +0000 2020'
function parseTwitterDate(date) {
  var year = date.substring(date.length - 4, date.length)
  var month = getMonth(date.substring(4, 7))
  var day = date.substring(8, 10)
  var hour = date.substring(11, 13)
  var minute = date.substring(14, 16)
  var second = date.substring(18, 20)
  var parsedDate = new Date(year, month, day, hour, minute, second, 0)
  return parsedDate
}

function getMonth(month) {
  const monthstrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (var i = 0; i < 12; i++) {
    if (month === monthstrs[i]) {
      return i
    }
  }
}

function tweetCount(props) {
  //get data from url
  var url = 'https://api.twitter.com/labs/1/users?ids=25073877&format=detailed'
  var service = new CopyofTwitterlib.OAuth(props)
  var response = service.fetch(url)
  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText())
  }
  return parseInt(data['data'][0]['stats']['tweet_count'])
}

function remainingCalls(service) {
  var requests = 'https://api.twitter.com/1.1/application/rate_limit_status.json?resources=statuses'
  var requestsObject = JSON.parse(service.fetch(requests).getContentText())
  return requestsObject["resources"]["statuses"]["\/statuses\/user_timeline"]["remaining"]
}

function pricedata() {
  //PI api data
  var url = 'https://www.predictit.org/api/marketdata/all/'
  var data = JSON.parse(UrlFetchApp.fetch(url, { 'muteHttpExceptions': true }).getContentText())
  var markets = data['markets']

  //spreadsheet data

  //replace with your spreadsheet
  var activeSpreadsheet = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1rdtRKE-FgAMk9O5vNhlM9tZ0-c_ts76btTPEDnuRfcU/edit#gid=1443382188')
  var template = activeSpreadsheet.getSheetByName('Template')

  for (var i in markets) {
    var Market = markets[i]
    var list = []
    if (Market['shortName'].indexOf('@realDonaldTrump') != -1) {
      var contracts = Market['contracts']
      var marketDate = new Date(contracts[0]['dateEnd'])
      var currentDate = new Date()

      //create new spreadsheet if none currently exists
      if (activeSpreadsheet.getSheetByName(Market['shortName']) === null) {
        activeSpreadsheet.insertSheet(Market['shortName'], 0, { template: template })
      }
      var sheet = activeSpreadsheet.getSheetByName(Market['shortName'])


      //make sure date is correct
      if (currentDate < marketDate) {
        list.concat(parsePIDate(currentDate))
        list.concat(parseBins(contracts))

        //push counts and tweets               
        var tweetsAndCount = getTweetsAndCount(sheet)
        if (typeof (tweetsAndCount) === 'boolean') {
          return false
        }
        else {
          list = list.concat(tweetsAndCount)
          sheet.appendRow(list)
        }
      }
      else {
        //reset official tweet count
        data.getRange('A2').setValue(0)
      }
    }
    break
  }
}

function getTweetsAndCount(sheet) {
  //get data from url
  var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=25073877&count=5&tweet_mode=extended&exclude_replies=false&include_rts=1'
  
  var twitterKeys = {
    TWITTER_CONSUMER_KEY: 'removed',
    TWITTER_CONSUMER_SECRET: 'removed',
    TWITTER_ACCESS_TOKEN: 'removed',
    TWITTER_ACCESS_SECRET: 'removed'
  }
  var props = PropertiesService.getScriptProperties().setProperties(twitterKeys)
  var service = new CopyofTwitterlib.OAuth(props)
  var response = service.fetch(url)
  var lastTweetTime = sheet.getRange("AI" + lastRow).getValue()

  //Twitter API workaround: retry failed / incomplete GETS until success
  var notLongEnough = true
  var screwups = 0;
  var lastRow = sheet.getLastRow()
  while (notLongEnough) {
    var tweetlist = []
    var data = JSON.parse(response.getContentText())
    for (var i = 0; i < 5; i++) {
      var tweet = data[i]
      if (typeof (tweet) == 'undefined') {
        i += 100
      }
      else {
        while (typeof (tweet['retweeted_status']) !== 'undefined') {
          tweet = tweet['retweeted_status']
        }
        tweetlist.push(tweet["user"]["name"])
        tweetlist.push(tweet["full_text"])
      }
    }
    console.log(tweetlist)
    //tweet is the last tweet now
    if (tweetlist.length === 10 && parseTwitterDate(tweet["created_at"]) < parseTwitterDate(lastTweetTime)) {
      notLongEnough = false
      tweetlist.push(tweet["created_at"])
    }
    else if (screwups > 15) {
      notLongEnough = false
      return false
    }
    else {
      response = service.fetch(url)
      screwups = screwups + 1
    }
  }
  console.log("screwups: " + screwups)
  //counts
  var count = tweetCount(props)
  //official count
  var dataArr = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data')
  var officialCount = count - dataArr.getRange('A2').getValue()

  //when starting up a new spreadsheet
  if (lastRow === 1) {
    var countList = [officialCount, officialCount]
    countList = countList.concat(tweetlist)
    return countList
  }
  else {
    //actual count (# of tweets since last row)    
    var actualCount = 0
    var lastTweet = "Z" + lastRow
    var lastCount = "X" + lastRow
    for (var i = 1; i < tweetlist.length; i += 2) {
      if (tweetlist[i].localeCompare(sheet.getRange(lastTweet).getValue()) === 0) {
        actualCount = actualCount + (i - 1) / 2
        i = i + 100
      }
      else if (i === 9) {
        actualCount = actualCount + 5
      }
    }
    actualCount = actualCount + sheet.getRange(lastCount).getValue()
    var countList = [officialCount, actualCount]
    console.log(remainingCalls(service))
    return countList.concat(tweetlist)
  }
}
