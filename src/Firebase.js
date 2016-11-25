import firebase from 'firebase/app';
import 'firebase/database';

const config = {
  apiKey: "AIzaSyB0tS1y7CuT5a0VPZVObxnvlm6LtllE5iE",
  authDomain: "guessthe-band.firebaseapp.com",
  databaseURL: "https://guessthe-band.firebaseio.com",
  storageBucket: "guessthe-band.appspot.com",
  messagingSenderId: "979714807474"
};

firebase.initializeApp(config);

const database = firebase.database();

export function updateChallenge(challengeData, _id){
  const id = database.ref().child('challenges').push().key;
  const updates = {
    [`/challenges/${id}`]: challengeData,
  }
  firebase.database().ref().update(updates);
  return { id };
}

export function getChallenge(id, cb){
  return database.ref(`/challenges/${id}`).once('value');
}