angular.module('starter.services', [])

.service('_1selfService', function() {

    var config = {
        appId: "app-id-sense4ae4feb02fh37ff92c83c4k7ud0",
        appSecret: "app-secret",
        "appName": "co.1self.sense_by_1self",
        "appVersion": "0.0.1"
    };

    var lib1self;
    var stream;

    var register1selfService = function() {
        console.log('registering 1self client and fetching stream');
        lib1self = new Lib1selfClient(config, "staging");
        lib1self.fetchStream(function(err, response) {
            stream = response;
            console.log('got stream', stream.streamid());
        });
    };

    var logTo1self = function(drinkType, dateTime) {

        var actionTags = ['drink'];
        var dt = new Date(dateTime);

        drinkType = formatFor1self(drinkType);
        actionTags.push(drinkType);

        var eventToLog = {
            "source": config.appName,
            "version": config.appVersion,
            "dateTime": lib1self.formatLocalDateInISOWithOffset(dt),
            "objectTags": ["self"],
            "actionTags": actionTags/*,
            "properties": {
                "quantity": quantity
            }*/
        };

        console.log("Sending event to 1self:", eventToLog);
        lib1self.sendEvent(eventToLog, stream);
        console.log("Event sent:", eventToLog);
    };

    var getVizUrl = function(actionTags) {
        var url = lib1self
            .objectTags(["self"])
            .actionTags(actionTags)
            .count()
            .barChart()
            .backgroundColor("ddcc19")
            .url(stream);
        console.info(url);
        return url;
        // window.open(url, "_system", "location=no");
    };

    function formatFor1self(field) {
        field = field.replace(' ', '-');
        field = field.toLowerCase();
        return field;
    }

    return {
        register1selfService: register1selfService,
        logTo1self: logTo1self,
        getVizUrl: getVizUrl
    };
})

.service('notificationService', function() {

    var registerNotificationMonitoring = function() {
        cordova.plugins.notification.local.on("click", function(notification) {
            console.log("clicked: " + notification.id, notification.data);
        });
    };

    return {
        registerNotificationMonitoring: registerNotificationMonitoring
    };
})

.service('persistanceService', function() {

    var getPendingDrinks = function() {
        var storedPendingDrinks = localStorage.pendingDrinks;

        if (storedPendingDrinks) {
            storedPendingDrinks = JSON.parse(storedPendingDrinks);
        } else {
            storedPendingDrinks = [];
        }

        return storedPendingDrinks;
    };

    var addPendingDrink = function(dateTime) {
        var storedPendingDrinks = getPendingDrinks();
        var drink = {};

        drink.dateTime = dateTime;

        storedPendingDrinks.push(drink);

        savePendingDrinks(storedPendingDrinks);

        return storedPendingDrinks;
    };

    var savePendingDrinks = function(storedPendingDrinks) {
        localStorage.pendingDrinks = JSON.stringify(storedPendingDrinks);
    };

    var removePendingDrinkByIdx = function (drinkIdx) {
        var storedPendingDrinks = getPendingDrinks();
        storedPendingDrinks.splice(drinkIdx, 1);
        savePendingDrinks(storedPendingDrinks);
    };

    var getRangeEntries = function() {
        var storedRangeEntries = localStorage.rangeEntries;

        if (storedRangeEntries) {
            storedRangeEntries = JSON.parse(storedRangeEntries);
        } else {
            storedRangeEntries = [];
        }

        return storedRangeEntries;
    };

    var getRangeEntryByRegionName = function(regionName) {
        var storedRangeEntries = getRangeEntries();
        for (var i = 0; i < storedRangeEntries.length; i++) {
            if (storedRangeEntries[i].regionName === regionName)
                return storedRangeEntries[i];
        }
        return false;
    };

    var lastRangeEntryWasWithin = function(lastEntryInterval, regionName) {
        var now = new Date();
        now = now.getTime();
        var lastRangeEntry = getRangeEntryByRegionName(regionName);
        if (lastRangeEntry) {
            if (now - lastRangeEntry.dateTime > lastEntryInterval)
                return true;
            else
                return false;
        } else {
            return false;
        }
    };

    var updateLastRangeEntry = function(regionName, dateTime) {
        var storedRangeEntries = getRangeEntries();
        var doneWork = false;
        for (var i = 0; i < storedRangeEntries.length; i++) {
            if (storedRangeEntries[i].regionName === regionName) {
                storedRangeEntries[i].dateTime = dateTime;
                doneWork = true;
                break;
            }
        }
        if (!doneWork) {
            storedRangeEntries.push({ regionName: regionName, dateTime: dateTime });
        }
        localStorage.rangeEntries = JSON.stringify(storedRangeEntries);
    };

    return {
        getPendingDrinks: getPendingDrinks,
        addPendingDrink: addPendingDrink,
        removePendingDrinkByIdx: removePendingDrinkByIdx,
        lastRangeEntryWasWithin: lastRangeEntryWasWithin,
        updateLastRangeEntry: updateLastRangeEntry
    };

})

.service('locationService', function() {
    var $http, $window;

    var config = function(httpVar, windowVar) {
        $http = httpVar;
        $window = windowVar;
    };

    var softExitIntervalSec = 10;
    var logSoftExits = false;

    function RegionChange() {
        var enterHandlers = []; // observers
        var exitHandlers = []; // observers
        var rangeHandlers = []; // observers

        this.onEnterRegion = function(regionName, fn) {
            var handler = { regionName: regionName, handler: fn };
            enterHandlers.push(handler);
        };

        this.onExitRegion = function(regionName, fn) {
            var handler = { regionName: regionName, handler: fn };
            exitHandlers.push(handler);
        };

        this.enteredRegion = function(regionInfo) {
            enterHandlers.forEach(function (enterHandler) {
                if (enterHandler.regionName === regionInfo['region-name'])
                    enterHandler.handler(regionInfo);
            });
        };

        this.exitedRegion = function(regionInfo) {
            exitHandlers.forEach(function (exitHandler) {
                if (exitHandler.regionName === regionInfo['region-name'])
                    exitHandler.handler(regionInfo);
            });
        };

        this.isWithinRange = function(regionName, range) {
            rangeHandlers.forEach(function (rangeHandler) {
                if (rangeHandler.regionName === regionName) {
                    if (rangeHandler.withinRange > range) {
                        rangeHandler.handler(regionName, range);
                    } else {
                        console.log('not within range', range);
                    }
                }
            });
        };

        this.onWithinRange = function(regionName, withinRange, fn) {
            var handler = { regionName: regionName, withinRange: withinRange, handler: fn };
            rangeHandlers.push(handler);
        };
    }

    var regionChange = new RegionChange();

    var UUIDS = [   
        { 'uuid':'3f670706-8e2e-4f33-b7b2-23ea3122df8b',
          "regionName":"testimote"
        }/*, 
        { 'uuid':'A0BB6C30-2C06-427A-8B67-6CC8E3456B62',
          "regionName":"rpi-sensor-station"
        }, 
        { 'uuid':'B0BB6C30-2C06-427A-8B67-6CC8E3456B62',
          "regionName":"rpi2-sensor-station"
        }*/
    ];

    var beaconRegions = [];
    var intervalManager;

    var getBeaconRegion = function(UUID) {
        for (var i = 0; i < beaconRegions.length; i++) {
            if (beaconRegions[i].uuid === UUID)
                return beaconRegions[i];
        }
        return null;
    };

    var getBeaconRegionByName = function(regionName) {
        for (var i = 0; i < beaconRegions.length; i++) {
            if (beaconRegions[i].identifier === regionName)
                return beaconRegions[i];
        }
        return null;
    };

    var registerBeaconMonitoring = function() {

        enableBT();

        var delegate = new cordova.plugins.locationManager.Delegate();

        delegate.didDetermineStateForRegion = function(pluginResult) {
            console.log("Did determine state");
            console.log(pluginResult);

            if (pluginResult.state && pluginResult.region && pluginResult.region.uuid && pluginResult.region.uuid.length > 0) {

                if (pluginResult.state === "CLRegionStateInside") {
                    enteredBeaconRegion(pluginResult.region.identifier, pluginResult.region.uuid, 111, 222);

                    doRangingBursts(getBeaconRegion(pluginResult.region.uuid));
                    // cordova.plugins.locationManager.startRangingBeaconsInRegion(getBeaconRegion(pluginResult.region.uuid))
                    //     .fail(console.error)
                    //     .done();

                } else if (pluginResult.state === "CLRegionStateOutside") {
                    exitedBeaconRegion(pluginResult.region.identifier, pluginResult.region.uuid, 111, 222);
                    
                    stopRanging(getBeaconRegion(pluginResult.region.uuid));

                    clearInterval(intervalManager);
                }
            } else {
                console.log('No region information');
            }
        };

        delegate.didStartMonitoringForRegion = function(pluginResult) {
            console.log('didStartMonitoringForRegion:', pluginResult);
        };

        delegate.didRangeBeaconsInRegion = function(pluginResult) {
            console.log('didRangeBeaconsInRegion:', pluginResult);
            if (pluginResult.beacons.length > 0) {
                doWithinRangeWork(pluginResult);
            }
            // stopRanging(getBeaconRegion(pluginResult.region.uuid));
        };


        cordova.plugins.locationManager.setDelegate(delegate);

        // required in iOS 8+
        cordova.plugins.locationManager.requestWhenInUseAuthorization();
        // or cordova.plugins.locationManager.requestAlwaysAuthorization()

        for (i = 0; i < UUIDS.length; i++) {

            var identifier = UUIDS[i].regionName;
            var uuid = UUIDS[i].uuid;

            var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid); //, major, minor);
            beaconRegions.push(beaconRegion);
            cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
                .fail(console.error)
                .done();
        }

    };

    var stopAllMonitoringForPeriod = function(pausePeriod, regionName) {
        console.log('stopping all monitoring for period');
        var beaconRegion = getBeaconRegionByName(regionName);

        clearInterval(intervalManager);

        stopRanging(beaconRegion); 

        cordova.plugins.locationManager.stopMonitoringForRegion(beaconRegion)
            .fail(console.error)
            .done();

        setTimeout(function() {
            console.log('restarting monitoring');
            cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
                .fail(console.error)
                .done();
        }, pausePeriod);
    };

    function doRangingBursts(beaconRegion) {
        startThenStopRanging(beaconRegion); 

        // now re-range every x seconds    
        var interval = 1000 * 120;
        intervalManager = setInterval(function() {
            startThenStopRanging(beaconRegion);
        }, interval);
    }

    function startThenStopRanging(beaconRegion) {
        console.log('startThenStopRanging', beaconRegion);
        cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
            .fail(console.error)
            .done();

        // having done some ranging, stop again after 10sec
        setTimeout(function() {
            stopRanging(beaconRegion); 
        }, 10000);
    }

    function stopRanging(beaconRegion) {
        console.log('stopping ranging', beaconRegion);
        cordova.plugins.locationManager.stopRangingBeaconsInRegion(beaconRegion)
            .fail(console.error)
            .done();
    }

    function enableBT() {
        try {
            cordova.plugins.locationManager.isBluetoothEnabled()
                .then(function(isEnabled) {
                    // console.log("isEnabled: " + isEnabled);
                    if (isEnabled) {
                        // cordova.plugins.locationManager.disableBluetooth();
                    } else {
                        cordova.plugins.locationManager.enableBluetooth();
                    }
                })
                .fail(console.error)
                .done();
        } catch (e) {
            console.log('error enabling bluetooth', e);
        }
    }

    function enteredBeaconRegion(regionName, uuid, major, minor) {

        var now = new Date();
        var dateStr = now.toISOString();
        var friendlyDateStr = now.toString();

        var regionKey = uuid + "/" + major + "/" + minor;
        var lastEntered = 0;
        var lastExited = 0;
        var enteredExitedRegions = tryParseJSON(localStorage.enteredExitedRegions);
        var enterType = "";

        console.log("enteredExitedRegions", enteredExitedRegions);

        if (enteredExitedRegions) {
            var i;
            var thisRegionInfo;
            for (i = 0; i < enteredExitedRegions.length; i++) {
                if (enteredExitedRegions[i].regionKey === regionKey) {
                    thisRegionInfo = enteredExitedRegions[i];
                    break;
                }
            }

            if (thisRegionInfo) {
                lastEntered = thisRegionInfo.enteredDate;
                lastExited = thisRegionInfo.exitedDate;
                enteredExitedRegions[i].enteredDate = now.getTime();
            } else {
                enteredExitedRegions.push({
                    "regionKey": regionKey,
                    "enteredDate": now.getTime()
                });
            }
        } else {
            enteredExitedRegions = [{
                "regionKey": regionKey,
                "enteredDate": now.getTime()
            }];
        }

        localStorage.enteredExitedRegions = JSON.stringify(enteredExitedRegions);

        // console.log("now.getTime() - lastEntered", now.getTime() - lastEntered);

        if (now.getTime() - lastEntered < softExitIntervalSec * 1000) {
            // soft enter
            enterType = "soft";
        } else {
            // hard enter
            enterType = "hard";

        }

        console.log('enterType', enterType);

        writeProximityEvent(dateStr, regionName, 'enter', enterType, uuid, major, minor);
    }

    function doWithinRangeWork(pluginResult) {
        regionChange.isWithinRange(pluginResult.region.identifier, pluginResult.beacons[0].accuracy);
    }

    function exitedBeaconRegion(regionName, uuid, major, minor) {
        var now = new Date();
        var dateStr = now.toISOString();

        setTimeout(function() {
            doExitWork(now, regionName, uuid, major, minor);
        }, softExitIntervalSec * 1000);

    }

    function doExitWork(timeOfExit, regionName, uuid, major, minor) {

        var dateStr = timeOfExit.toISOString();
        var friendlyDateStr = timeOfExit.toString();

        var regionKey = uuid + "/" + major + "/" + minor;
        var lastEntered = 0;
        var lastExited = 0;
        var enteredExitedRegions = tryParseJSON(localStorage.enteredExitedRegions);
        var exitType = "";

        // console.log("enteredExitedRegions", enteredExitedRegions);

        if (enteredExitedRegions) {
            var i;
            var thisRegionInfo;
            for (i = 0; i < enteredExitedRegions.length; i++) {
                if (enteredExitedRegions[i].regionKey === regionKey) {
                    thisRegionInfo = enteredExitedRegions[i];
                    break;
                }
            }

            if (thisRegionInfo) {
                lastEntered = thisRegionInfo.enteredDate;
                lastExited = thisRegionInfo.exitedDate;
                enteredExitedRegions[i].exitedDate = timeOfExit.getTime();
            } else {
                enteredExitedRegions.push({
                    "regionKey": regionKey,
                    "exitedDate": timeOfExit.getTime()
                });
            }
        } else {
            enteredExitedRegions = [{
                "regionKey": regionKey,
                "exitedDate": timeOfExit.getTime()
            }];
        }

        localStorage.enteredExitedRegions = JSON.stringify(enteredExitedRegions);

        // console.log("lastEntered - timeOfExit.getTime()", lastEntered - timeOfExit.getTime());

        // if I entered again within softExitIntervalSec seconds then soft exit else hard exit
        if (lastEntered > timeOfExit.getTime()) {
            // soft exit
            exitType = "soft";
        } else {
            // hard exit
            exitType = "hard";
        }

        console.log('exitType', exitType);

        writeProximityEvent(dateStr, regionName, 'exit', exitType, uuid, major, minor);
    }

    function writeProximityEvent(dateStr, regionName, action, enterExitType, uuid, major, minor) {

        var properties = {
            "geofence": "ibeacon://" + uuid,
            "type": enterExitType,
            "region-name": regionName
        }; // + "/" + major + "/" + minor"}

        if (action === 'enter') {
            regionChange.enteredRegion(properties);
        } else if (action === 'exit') {
            regionChange.exitedRegion(properties);
        }

        // writeEventTo1self(dateStr, ["ibeacon", "proximity"], [action], properties);
    }

    function writeEventTo1self(dateStr, objTagArray, actionTagArray, propertiesObj) {

        var proximityEvent = {
            "dateTime": dateStr,
            "objectTags": objTagArray,
            "actionTags": actionTagArray,
            "properties": propertiesObj
        };

    }

    return {
        config: config,
        registerBeaconMonitoring: registerBeaconMonitoring,
        onEnterRegion: regionChange.onEnterRegion,
        onExitRegion: regionChange.onExitRegion,
        onWithinRange: regionChange.onWithinRange,
        stopAllMonitoringForPeriod: stopAllMonitoringForPeriod
    };
})

.factory('Chats', function() {
    // Might use a resource here that returns a JSON array

    // Some fake testing data
    var chats = [{
        id: 0,
        name: 'Ben Sparrow',
        lastText: 'You on your way?',
        face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
    }, {
        id: 1,
        name: 'Max Lynx',
        lastText: 'Hey, it\'s me',
        face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
    }, {
        id: 2,
        name: 'Adam Bradleyson',
        lastText: 'I should buy a boat',
        face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
    }, {
        id: 3,
        name: 'Perry Governor',
        lastText: 'Look at my mukluks!',
        face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
    }, {
        id: 4,
        name: 'Mike Harrington',
        lastText: 'This is wicked good ice cream.',
        face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
    }];

    return {
        all: function() {
            return chats;
        },
        remove: function(chat) {
            chats.splice(chats.indexOf(chat), 1);
        },
        get: function(chatId) {
            for (var i = 0; i < chats.length; i++) {
                if (chats[i].id === parseInt(chatId)) {
                    return chats[i];
                }
            }
            return null;
        }
    };
});
