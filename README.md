# @realdonaldtrump Tweet Collection

I wrote this code in 2020 to track @realdonaldtrump tweets for data analysis. It scrapes data from Twitter and Predictit's APIs, then uses Google Apps Script to store it in a spreadsheet. 

## Why Apps Script?

I wanted 24/7 uptime, and hosting my application would have cost money.

## Why the spaghetti?

The free Twitter API occasionally refuses to return results, or returns results from years ago. Since paying for a premium API would have cost money, I was forced to work around this by repeatedly calling the API.

## Getting Started

To run this code yourself, copy the spreadsheet below, then copy-paste tweets.js as an extension. Deploy the code as an API executable, and you're set. (You probably want to set it to run every minute, though.)

https://docs.google.com/spreadsheets/d/1rdtRKE-FgAMk9O5vNhlM9tZ0-c_ts76btTPEDnuRfcU/edit?usp=sharing
