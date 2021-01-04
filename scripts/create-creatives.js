/*eslint-disable */
/**
 *
 * This script creates a creative for each price point specified in
 * ./price-points.json.
 *
 * Usage:
 *
 *   $ node scripts/create-creatives.js --channel A --platform M --position MIDDLE --region USA --partner SONOBI
 *
 */
/*eslint-enble */
'use strict';

var Bluebird = require('bluebird');
var formatter = require('../lib/formatter');
var _ = require('lodash');
var ProgressBar = require('progress');
var progressBar;
var argv = require('minimist')(process.argv.slice(2));

var DFP_CREDS = require('../local/application-creds');
var config = require('../local/config')
var formatter = require('../lib/formatter');

var Dfp = require('node-google-dfp-wrapper');

var credentials = {
  clientId: DFP_CREDS.installed.client_id,
  clientSecret: DFP_CREDS.installed.client_secret,
  redirectUrl: DFP_CREDS.installed.redirect_uris[0]
}

var dfp = new Dfp(credentials, config, config.refreshToken);

var channel = argv.channel;
var region = argv.region;
var position = argv.position;
var partner = argv.partner;
var platform = argv.platform;

var pricePoints = require('./price-points');
var sizes = require('./sizes')(platform);

var size = sizes[position];
var slots = require('../input/index-slot')(platform);

var slot = slots[position];

var CONCURRENCY = {
  concurrency: 1
};

console.log(process.argv.slice(2).join(' '));

function getCPM(pricePoint) {
  var cpm = pricePoint;

  //add trailing 0 if needed
  var index = pricePoint.length - 2;
  if (cpm[index] === '.') {
    cpm += '0';
  }

  return cpm;
}

function getCombinations() {
  var combinations = [];

  var count = ['1', '2', '3', '4', '5'];
  _.forEach(count, function(number) {

    var creative = formatter.formatCreative({
      size: size,
      partner: partner,
      platform: platform,
      region: region,
      channel: channel,
      position: position,
      number: number,
    });

    combinations.push(creative);

  });

  progressBar = new ProgressBar('Progress [:bar] :percent :elapseds', {
    total: combinations.length + 1
  });

  return combinations;
}

function prepareCreative(creative) {
  return dfp.prepareCreative(creative)
    .tap(function() {
      progressBar.tick();
    });
}

function createCreatives(creatives) {
  return dfp.createCreatives(creatives);
}

function logSuccess(results) {
  if (results) {
    console.log('sucessfully created creatives');
  }
}

function handleError(err) {
  progressBar.tick()
  console.log('creating creatives failed');
  console.log('because', err.stack);
}

Bluebird.resolve(getCombinations())
  .map(prepareCreative, CONCURRENCY)
  .then(createCreatives)
  .then(logSuccess)
  .catch(handleError)
