// expose our config directly to our application using module.exports
module.exports = {
    'facebookAuth' : {
        'clientID'      : '1585381351768665', // your App ID
        'clientSecret'  : '01825b87881c156f574bde370f4ed0f5', // your App Secret
        'callbackURL'   : 'https://parkinson-help.herokuapp.com/auth/facebook/callback'
    },
    'twitterAuth' : {
        'consumerKey'       : 'ElH1u1V6wvejpcA03ip6nGbjG',
        'consumerSecret'    : 'uBbCG85BnT5IyU4WtPVW3s6VUsBI56asEzMWY9I1rpBHooEwAG',
        'callbackURL'       : 'https://parkinson-help.herokuapp.com/auth/twitter/callback'
    },
    'googleAuth' : {
        'clientID'      : '711780751348-bhedpvunp4l0jtepqqc6rcto7l7878dg.apps.googleusercontent.com',
        'clientSecret'  : 'sRyfTMUvmAu-NdQYg13tNbRP',
        'callbackURL'   : 'https://parkinson-help.herokuapp.com/auth/google/callback'
    }

};
