import React, { Component } from 'react';
import SearchBox from 'react-autocomplete';
import YouTube from 'react-youtube';

import { updateChallenge, getChallenge } from './Firebase';

import 'whatwg-fetch';
import './App.css';
import '../vendor/normalize.css';
import '../vendor/skeleton.css';


function serialize(obj) {
  return '?' + Object.keys(obj).reduce((a,k) => {
    a.push(k + '=' + encodeURIComponent(obj[k]));
    return a
  }, []).join('&')
}

function getArtists(artistName){
  return fetch(`https://api.discogs.com/database/search?q=${artistName}&type=artist&token=FApTeGMISRjnzHTvFwSkRbjQczftmcROClieLHAS`)
    .then((response) => {
      return response.json()
    })
}

function getArtist(aristId){
  return fetch(`https://api.discogs.com/artists/${aristId}`)
    .then((response) => {
      return response.json()
    })
}

function getVideos(term){
  const params = {
    part: 'snippet',
    q: term,
    type: 'video',
    videoEmbeddable: true,
    key: 'AIzaSyDdJbMLU1s9b12ykYESxYOarrHLRzwQMjc',
  }
  return fetch(`https://content.googleapis.com/youtube/v3/search${serialize(params)}`)
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      return response.items.map(v => ({ videoId: v.id.videoId, title: v.snippet.title }))
    })
  // AIzaSyDdJbMLU1s9b12ykYESxYOarrHLRzwQMjc
}

function guessArtist(artistName, artistId){
  return getArtists(artistName)
    .then((r) => {
      const artists = r.results.slice(0, 4).map(a => a.id);
      return artists.includes(parseInt(artistId));
    })
}

function debounce(fn) {
  let timer = null;
  return function () {
    const context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, 500);
  };
}

class GuessChance extends Component {
  constructor(props) {
    super(props);
    this.state = {
      guessCount: 0,
      guessText: '',
      guessLabel: '3 Guesses Remaining',
    }
  }

  handleChange(event) {
    this.setState({ guessText: event.target.value });
  }

  handleClick(){
    guessArtist(this.state.guessText, this.props.artistId)
      .then((guessedRight) => {
        const currentCount = this.state.guessCount + 1;
        if (guessedRight) {
          this.setState({
            guessLabel: "You guessed right!",
            guessCount: currentCount,
          });
          this.props.success(this.timer.currentTime(), this.state.guessText);
        } else if (currentCount === 3){
          this.props.failure();
        } else {
          this.setState({
            guessLabel: `${3 - currentCount} trys remaining!`,
            guessCount: currentCount,
            guessText: '',
          });
        }
      })
  }

  handleKeyPress(target) {
    if (target.charCode == 13) {
      this.handleClick();
    }
  }

  fixVolume(event){
    event.target.unMute();
    event.target.setVolume(100);
  }
  render(){
    return (
      <div>
        <Timer ref={timer => this.timer = timer}/>
        <div className="hide">
          <YouTube videoId={this.props.videoId} onReady={this.fixVolume} opts={{playerVars: { autoplay: 1, playsinline: 1}}} />
        </div>
        <label>Artist Name</label>
        <input type="text" className="guess" autoFocus="true" value={this.state.guessText} onChange={this.handleChange.bind(this)} onKeyPress={this.handleKeyPress.bind(this)}/>
        <button onClick={this.handleClick.bind(this)}>Guess</button>
        <p>{this.state.guessLabel}</p>
      </div>
    )
  }
}

class Timer extends Component {
  constructor(props){
    super(props);
    this.state = {
      time: 0,
    }
    this.timer = null;
  }

  componentDidMount(){
    this.start();
  }

  componentWillUnmount() {
    this.stop()
  }

  currentTime() {
    return this.state.time;
  }

  start() {
    this.timer = setInterval(() => {
      const { time: oldTime } = this.state;
      const time = oldTime + 1;
      this.setState({ time })
    }, 1000)
  }

  stop(){
    if (this.timer){
      clearInterval(this.timer);
    }
  }

  render() {
    const { time } = this.state;
    const seconds = time % 60;
    const minutes = Math.floor(time / 60);
    const zeroPad = n => ('0' + n).slice(-2);
    return (
      <div className="timer-text">{zeroPad(minutes)}:{zeroPad(seconds)}</div>
    )
  }
};

class ArtistSearch extends Component {
  constructor(props){
    super(props);
    this.state = {
      artists: [],
      value: '',
    }
    this.debounceSearch = debounce((input) => this._onChange(input));
  }
  componentWillReceiveProps(nextProps){
    if(nextProps.value !== this.props.value) {
      this.setState({ value: nextProps.value });
    }
  }

  componentWillMount(){
    if (this.props.value) {
      this.setState({ value: this.props.value });
    }
  }
  _onChange(input) {
    getArtists(input)
      .then((r) => {
        return r.results.map(r => ({ name: r.title, id: r.id }));
      })
      .then(r => this.setState({ artists: r }));
  }
  render () {
    return (
      <SearchBox
        items={this.state.artists}
        onChange={(e, input) => {
          this.setState({ value: input });
          this.debounceSearch(input);
        }}
        inputProps={{
          type: "text",
          readOnly: this.props.readOnly,
          placeholder: "Search for artist . . ."
        }}
        onSelect={(_value, item) => {
          this.props.onSelect(item);
          this.setState({ value: item.name });
        }}
        value={this.state.value}
        getItemValue={(item) => item.name}
        renderItem={(item, isHighlighted) => (
            <div
              key={item.id}
              id={item.abbr}
            >
              {item.name}
            </div>
        )}

      />
    )
  }
}

class YouTubeSearch extends Component {
  constructor(props){
    super(props);
    this.state = {
      videos: [],
      value: '',
    }
  }
  componentWillReceiveProps(nextProps){
    if(nextProps.value !== this.props.value) {
      this.setState({ value: nextProps.value });
    }
  }

  componentWillMount(){
    if (this.props.value) {
      this.setState({ value: this.props.value });
    }
  }
  _onChange(input) {
    getVideos(input)
      .then(r => this.setState({ videos: r }));
  }
  render () {
    return (
      <SearchBox
        items={this.state.videos}
        onChange={(e, input) => {
          this.setState({ value: input });
          this._onChange(input);
        }}
        inputProps={{
          type: "text",
          readOnly: this.props.readOnly,
          placeholder: "Search for video . . ."
        }}
        onSelect={(_value, item) => {
          this.props.onSelect(item.videoId);
          this.setState({ value: item.title });
        }}
        value={this.state.value}
        getItemValue={(item) => item.videoId}
        renderItem={(item, isHighlighted) => (
            <div
              key={item.id}
              id={item.abbr}
            >
              {item.title}
            </div>
        )}

      />
    )
  }
}

class Game extends Component {
  constructor(props){
    super(props);
    this.defaultState = {
      currentChallenge: 0,
      totalTime: 0,
      failed: false,
      completions: [],
      preGame: true,
    }
    this.state = this.defaultState;
  }

  success(time, artistName){
    const { currentChallenge, totalTime, completions } = this.state;
    completions.push({ artistName, time })
    this.setState({currentChallenge: currentChallenge + 1, totalTime: totalTime + time, completions});
  }

  failure(){
    this.setState({ failed: true });
  }

  reset() {
    this.setState(this.defaultState);
  }

  startGame() {
    this.setState({ preGame: false });
  }

  render(){
    const challenge = this.props.challenges[this.state.currentChallenge];
    const completions = (
      <ul>
        {this.state.completions.map(({artistName, time}) => (
          <li>{artistName} - {time} seconds </li>
        ))}
      </ul>
    )
    if (this.state.preGame){
      return (
        <div className="main">
          <h1>Ready to play?</h1>
          <p>Make sure you can hear your computer</p>
          <p>Type the name of the artist to win. You only get 3 guesses per artist.</p>
          <button onClick={this.startGame.bind(this)}>I'm ready</button>
        </div>
        )
    }
    if (!challenge) {
      return (
        <div className="main">
          <h1>You Won in {this.state.totalTime} Seconds!!</h1>
          <p>
            <a href={window.location.href} target="_blink">Share this challenge with your friends.</a>
          </p>
          <div className="row">
            {completions}
          </div>
        </div>
      )
    }
    if (this.state.failed){
      return (
        <div className="main">
          <h1>You Failed. Better luck next time!</h1>
          <button onClick={this.reset.bind(this)}>Try again?</button>
          <div className="row">
            {completions}
          </div>
        </div>
      )
    }
    return (
      <div className="main">
        <div className="row">
          <GuessChance
            key={challenge.videoId+challenge.artistId}
            videoId={challenge.videoId}
            artistId={challenge.artistId}
            success={this.success.bind(this)}
            failure={this.failure.bind(this)} />
        </div>
        <div className="row">
          <h5>{this.state.currentChallenge} / {this.props.challenges.length - 1}</h5>
        </div>
        <div className="row">
          {completions}
        </div>
      </div>
    );
  }
}

class YouTubeAdd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoValue: '',
      ready: false,
      artist: null,
      done: false,
    };
  }

  componentWillMount(){
    if(this.props.videoId && this.props.artist){
      this.setState({ videoValue: this.props.videoId, artist: this.props.artist, done: true })
    }
  }

  handleChange(event) {
    this.setState({ inputValue: event.target.value });
  }

  setArtist(artist){
    this.setState({ artist }, this.checkReady);
  }

  setVideo(videoValue){
    this.setState({ videoValue }, this.checkReady);
  }

  checkReady(){
    const ready = !!(this.state.videoValue && this.state.artist);
    this.setState({ ready });
  }

  save(){
    const { videoValue: videoId, artist } = this.state;
    this.props.add({ videoId, artist });
    this.setState({ videoValue: '', artist: null, videoReady: false, ready: false });
  }

  render() {
    const artistValue = this.state.artist ? this.state.artist.name : '';
    const videoValue = this.state.videoValue || '';
    return (
      <div className="row">
        <div className="one-half column">
          <label>Arist Name</label>
          <ArtistSearch onSelect={this.setArtist.bind(this)} readOnly={this.state.done} value={artistValue}/>
          <br />
          <label>YouTube ID</label>
          <YouTubeSearch onSelect={this.setVideo.bind(this)} readOnly={this.state.done} value={videoValue}/>
        </div>
        <div className="one-half column">
          <YouTube
            videoId={this.state.videoValue} opts={{
              height: '195',
              width: '370',
            }}
          />
        </div>
        { this.state.ready && !this.state.done ? (<button onClick={this.save.bind(this)}>Add to Challenge</button>) : null}
      </div>
    )
  }
}

class CreateForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      challenges: [],
      linkUrl: '',
      id: null,
    };
  }

  handleAdd({ artist, videoId }){
    const { challenges } = this.state;
    challenges.push({ artist: artist, videoId });
    // ugh unify these
    const challengesJSON = JSON.stringify(challenges.map(c => ({ vi: c.videoId, ai: c.artist.id })));
    const firebaseObj = challenges.map(c => ({ videoId: c.videoId, artistId: c.artist.id }));
    const linkUrl = `#${btoa(challengesJSON)}`;
    const { id } = updateChallenge(firebaseObj, this.state.id);
    this.setState({ challenges, linkUrl, id });
  }

  render() {
    return (
      <div className="main">
        <div className="container">
          {this.state.challenges.map((c, index) => (
            <YouTubeAdd key={index} artist={c.artist} videoId={c.videoId} add={this.handleAdd.bind(this)} />
          ))}
          <YouTubeAdd add={this.handleAdd.bind(this)} />
        </div>
        <a target="_blank" href={this.state.linkUrl}>Share This Link</a>
      </div>
    )
  }
}

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      challenges: [],
      createMode: true,
    };
  }

  componentWillMount(){
    if(window.location.pathname.substr(0, 4) === "/id/") {
      const id = window.location.pathname.substr(4)
      getChallenge(id).then((snapshot) => {
        const challenges = snapshot.val();
        if (challenges.length > 0){
          this.setState({ challenges, createMode: false })
        }
      }).catch(err => console.log(err))
    } else {
      try {
        const challengeJson = atob(window.location.hash.substr(1));
        const challenges = JSON.parse(challengeJson).map(c => ({ videoId: c.vi, artistId: c.ai }));
        if (challenges.length > 0){
          this.setState({ challenges, createMode: false })
        }
      } catch(e) {
        console.log(e);
      }
    }
    ga('send', { //eslint-disable-line
      hitType: 'pageview',
      page: location.pathname
    });
  }

  render() {
    let component = (<Game challenges={this.state.challenges} />);
    if (this.state.createMode) {
      component = (<CreateForm />)
    }
    return (
      <div className="container">
        {component}
      </div>
    );
  }
};

export default App;
