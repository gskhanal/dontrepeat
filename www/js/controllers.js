angular.module('dontrepeatsheets.controllers', [])
  .controller('SignUpCtrl', [
    '$scope', '$rootScope', '$firebaseAuth', '$window',
    function ($scope, $rootScope, $firebaseAuth, $window) {
      $scope.user = {
        email: "",
        password: ""
      };
      $scope.createUser = function () {
        var email = this.user.email;
        var password = this.user.password;
        if (!email || !password) {
          $rootScope.notify("Please enter valid credentials");
          return false;
        }

        $rootScope.show('Please wait.. Registering');
        $rootScope.auth.$createUser($scope.user, function (error, user) {
          if (!error) {
            $rootScope.hide();
            $rootScope.userEmail = user.email;
            $window.location.href = ('#/bucket/list');
          }
          else {
            $rootScope.hide();
            if (error.code == 'INVALID_EMAIL') {
              $rootScope.notify('Invalid Email Address');
            }
            else if (error.code == 'EMAIL_TAKEN') {
              $rootScope.notify('Email Address already taken');
            }
            else {
              $rootScope.notify('Oops something went wrong. Please try again later');
            }
          }
        });
      }
    }
  ])

.controller('SignInCtrl', [
  '$scope', '$rootScope', '$firebaseAuth', '$window',
  function ($scope, $rootScope, $firebaseAuth, $window) {
     // check session
     $rootScope.checkSession();
     $scope.user = {
        email: "",
        password: ""
     };
     $scope.validateUser = function () {
        $rootScope.show('Please wait.. Authenticating');
        var email = this.user.email;
        var password = this.user.password;
        if (!email || !password) {
           $rootScope.notify("Please enter valid credentials");
           return false;
        }
        $rootScope.auth.$authWithPassword($scope.user)
        .then(function (user) {
          // console.log(user);
          $rootScope.hide();
          $rootScope.userEmail = user.password.email;
          console.log($rootScope.userEmail);
          $window.location.href = ('#/bucket/list');
        }, function (error) {
          $rootScope.hide();
          if (error.code == 'INVALID_EMAIL') {
            $rootScope.notify('Invalid Email Address');
          }
          else if (error.code == 'INVALID_PASSWORD') {
            $rootScope.notify('Invalid Password');
          }
          else if (error.code == 'INVALID_USER') {
            $rootScope.notify('Invalid User');
          }
          else {
            $rootScope.notify('Oops something went wrong. Please try again later');
          }
        });
     }
  }
])

.controller('myListCtrl', function($rootScope, $scope, $window, $ionicModal, $firebase) {
  $rootScope.show("Please wait... Processing");
  $scope.list = [];
  $scope.catList = [{title: 'Uncategorized'}];
  $scope.alert = '';
  var incidentSeverityIcons = {
    'low': 'ion-android-happy',
    'medium': 'ion-android-sad',
    'high': 'ion-android-alert',
    'critical': 'ion-android-hand',
  };
  // get recent alert
  var alertRef = new Firebase($rootScope.baseUrl + 'alert');
  alertRef.on('value', function(snapshot){
    $scope.alert = snapshot.val();
    $rootScope.hide();
  });
  // get incidents list
  var bucketListRef = new Firebase($rootScope.baseUrl + 'incidents');
  bucketListRef.orderByChild('created').on('value', function(snapshot) {
    var data = snapshot.val();
    $scope.list = [];
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        data[key].key = key;
        if (data[key].severity) {
          data[key].severityClass = 'incident-severity incident-severity-' + data[key].severity.toLowerCase();
          data[key].severityIconClass = incidentSeverityIcons[data[key].severity.toLowerCase()]
        }
        $scope.list.push(data[key]);
      }
    }
    if ($scope.list.length == 0) {
      $scope.noData = true;
    } else {
      $scope.noData = false;
    }
    $rootScope.hide();
  });

  $ionicModal.fromTemplateUrl('templates/newItem.html', function(modal) {
    $scope.newTemplate = modal;
  });

  $scope.newTask = function() {
    $scope.newTemplate.show();
  };

  $ionicModal.fromTemplateUrl('templates/newCat.html', function(modal) {
    $scope.newCatTemplate = modal;
  });

  $scope.newCat = function() {
    $scope.newCatTemplate.show();
  };

  $scope.markCompleted = function(key) {
    $rootScope.show("Please wait... Updating List");
    var itemRef = new Firebase($rootScope.baseUrl + escapeEmailAddress($rootScope.userEmail) + '/' + key);
    itemRef.update({
      isCompleted: true
    }, function(error) {
      if (error) {
        $rootScope.hide();
        $rootScope.notify('Oops! something went wrong. Try again later');
      } else {
        $rootScope.hide();
        $rootScope.notify('Successfully updated');
      }
    });
  };

  $scope.deleteItem = function(key) {
    $rootScope.show("Please wait... Deleting from List");
    var itemRef = new Firebase($rootScope.baseUrl + escapeEmailAddress($rootScope.userEmail));
    bucketListRef.child(key).remove(function(error) {
      if (error) {
        $rootScope.hide();
        $rootScope.notify('Oops! something went wrong. Try again later');
      } else {
        $rootScope.hide();
        $rootScope.notify('Successfully deleted');
      }
    });
  };
})
.controller('newCtrl', function($rootScope, $scope, $window, $firebase) {
  $scope.data = {
    title: "", description: "", category: "", tags: "", location: "", severity: "",
  };
  var categoryListRef = new Firebase($rootScope.baseUrl + 'categories');
  categoryListRef.on('value', function(snapshot) {
    var data = snapshot.val();
    $scope.catList = [{title: 'Uncategorized'}];
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        data[key].key = key;
        $scope.catList.push(data[key]);
      }
    }
  });

  $scope.close = function() {
    $scope.modal.hide();
  };

  $scope.createNew = function() {
    var title = this.data.title;
    var description = this.data.description;
    var category = this.data.category;
    var tags = this.data.tags;
    var location = this.data.location;
    var severity = this.data.severity;

    if (!title) return;

    $scope.modal.hide();
    $rootScope.show();
    $rootScope.show("Please wait... Creating new");

    var form = {
      title: title,
      description: description,
      category: category,
      tags: tags,
      location: location,
      severity: severity,
      email: escapeEmailAddress($rootScope.userEmail),
      isCompleted: false,
      created: Date.now(),
      updated: Date.now()
    };

    var bucketListRef = new Firebase($rootScope.baseUrl + 'incidents');
    bucketListRef.push(form);

    // $firebase(bucketListRef).$add(form);
    $rootScope.hide();
  };
})
.controller('newCatCtrl', function($rootScope, $scope, $window, $firebase) {
  $scope.data = {
    title: ""
  };

  $scope.close = function() {
    $scope.modal.hide();
  };

  $scope.createNewCat = function() {
    var title = this.data.title;

    if (!title) return;

    $scope.modal.hide();
    $rootScope.show();
    $rootScope.show("Please wait... Creating new");

    var category = {
      title: title,
    };

    var categoryListRef = new Firebase($rootScope.baseUrl + 'categories');
    categoryListRef.push(category);

    // $firebase(bucketListRef).$add(form);
    $rootScope.hide();
  };
})
.controller('completedCtrl', function($rootScope, $scope, $window, $firebase) {
  $rootScope.show("Please wait... Processing");
  $scope.list = [];

  var bucketListRef = new Firebase($rootScope.baseUrl + escapeEmailAddress($rootScope.userEmail));
  bucketListRef.on('value', function(snapshot) {
    $scope.list = [];
    var data = snapshot.val();

    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        if (data[key].isCompleted == true) {
          data[key].key = key;
          $scope.list.push(data[key]);
        }
      }
    }
    if ($scope.list.length == 0) {
      $scope.noData = true;
    } else {
      $scope.noData = false;
    }

    $rootScope.hide();
  });

  $scope.deleteItem = function(key) {
    $rootScope.show("Please wait... Deleting from List");
    var itemRef = new Firebase($rootScope.baseUrl + escapeEmailAddress($rootScope.userEmail));
    bucketListRef.child(key).remove(function(error) {
      if (error) {
        $rootScope.hide();
        $rootScope.notify('Oops! something went wrong. Try again later');
      } else {
        $rootScope.hide();
        $rootScope.notify('Successfully deleted');
      }
    });
  };
});


function escapeEmailAddress(email) {
  if (!email) return false
  // Replace '.' (not allowed in a Firebase key) with ','
  email = email.toLowerCase();
  email = email.replace(/\./g, ',');
  return email.trim();
}