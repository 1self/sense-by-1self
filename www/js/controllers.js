angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, locationService, persistanceService, _1selfService) {

  // locationService.registerBeaconMonitoring();

  $scope.pendingDrinks = persistanceService.getPendingDrinks();

  var removePendingDrink = function(pendingDrink) {
    var drinkIdx = -1;
    for (var i = 0; i < $scope.pendingDrinks.length; i++) {
      if ($scope.pendingDrinks[i].dateTime === pendingDrink.dateTime) {
        drinkIdx = i;
        break;
      }
    }
    if (drinkIdx >= 0) {
      // $scope.pendingDrinks.splice(drinkIdx, 1);
      persistanceService.removePendingDrinkByIdx(drinkIdx);
    }
  };

  $scope.setDrink = function(pendingDrink, setDrink) {
    if (setDrink === 'Yes') {
      pendingDrink.choose = true;
      pendingDrink.showOther = false;
    } else {
      removePendingDrink(pendingDrink);
      pendingDrink.cancelled = true;
    }
  };

  $scope.choseDrink = function(pendingDrink, choice) {
    console.log(choice);
    if (choice === 'Other') {
      pendingDrink.showOther = true;
    } else {
      _1selfService.logTo1self(choice, pendingDrink.dateTime);
      removePendingDrink(pendingDrink);
      pendingDrink.drinkChoice = choice;
      pendingDrink.saved = true;
    }
  };

  $scope.saveOther = function(pendingDrink) {
    if (pendingDrink.otherText && pendingDrink.otherText !== '') {
      if (validateText(pendingDrink)) {
         _1selfService.logTo1self(otherText, pendingDrink.dateTime);
        removePendingDrink(pendingDrink);
        pendingDrink.drinkChoice = pendingDrink.otherText;
        pendingDrink.saved = true;       
      }
    }
  };

  $scope.niceFormatDate = function(dateTime) {
    var dt = new XDate(dateTime);
    return dt.toString("HH:mm d MMM");
  };

  function validateText(pendingDrink) {
    if (pendingDrink.otherText.match(/^[-\sa-zA-Z]+$/)) {
      pendingDrink.invalidOtherText = false;
      return true;
    } else {
      pendingDrink.invalidOtherText = true;
      return false;
    }
  }

})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
