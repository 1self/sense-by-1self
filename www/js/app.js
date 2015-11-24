// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services'])

.run(function($ionicPlatform, locationService, notificationService, persistanceService, _1selfService) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    _1selfService.register1selfService();

    locationService.registerBeaconMonitoring();

    locationService.onEnterRegion('testimote', function (regionInfo) {
      console.log('entered region', regionInfo);
    });

    locationService.onExitRegion('testimote', function (regionInfo) {
      console.log('exited region', regionInfo);
    });

    locationService.onWithinRange('testimote', 0.95, function (regionName, range) {
      didEnterRange(regionName);
    });
     
    notificationService.registerNotificationMonitoring();

    function didEnterRange(regionName) {
      var now = new Date();
      var lastEntryInterval = 1000 * 60 * 10;
      var pauseMonitoringFor = 1000 * 60 * 10;
      
      if (persistanceService.lastRangeEntryWasWithin(lastEntryInterval, regionName)) {
        // ignore
      } else {
        console.log('didEnterRange!', regionName);
        persistanceService.updateLastRangeEntry(regionName);
        locationService.stopAllMonitoringForPeriod(pauseMonitoringFor, regionName);

        var _120_sec_from_now = new Date(now.getTime() + 120*1000);

        var pendingDrinks = persistanceService.addPendingDrink(now);

        var plural = pendingDrinks.length === 1 ? '' : 's';
        
        cordova.plugins.notification.local.schedule({
            id: 1,
            title: pendingDrinks.length + ' drink' + plural + ' pending',
            text: 'You have ' + pendingDrinks.length + ' drink' + plural + ' pending',
            badge: pendingDrinks.length,
            at: _120_sec_from_now
            // data: { entryTimes: [ now.getTime() ] }
        });
      }
    }
  });
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html'
  })

  // Each tab has its own nav history stack:

  .state('tab.dash', {
    cache: false,
    url: '/dash',
    views: {
      'tab-dash': {
        templateUrl: 'templates/tab-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

  .state('tab.chats', {
      url: '/chats',
      views: {
        'tab-chats': {
          templateUrl: 'templates/tab-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })
    .state('tab.chat-detail', {
      url: '/chats/:chatId',
      views: {
        'tab-chats': {
          templateUrl: 'templates/chat-detail.html',
          controller: 'ChatDetailCtrl'
        }
      }
    })

  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/dash');

  $ionicConfigProvider.tabs.position("bottom");

});
