import React, { Component } from 'react';
import SearchBox from 'react-autocomplete';
import YouTube from 'react-youtube';

import './App.css';
import '../vendor/normalize.css';
import '../vendor/skeleton.css';

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
      guessLabel: 'No Guesses',
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
          this.props.success(this.timer.currentTime());
        } else if (currentCount === 3){
          this.props.failure();
        } else {
          this.setState({
            guessLabel: `${3 - currentCount} guesses left!`,
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

  render(){
    return (
      <div>
        <Timer ref={timer => this.timer = timer}/>
        <div className="hide">
          <YouTube videoId={this.props.videoId} opts={{playerVars: { autoplay: 1}}} />
        </div>
        <input type="text" value={this.state.guessText} onChange={this.handleChange.bind(this)} onKeyPress={this.handleKeyPress.bind(this)}/>
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

class AristSearch extends Component {
  constructor(props){
    super(props);
    this.state = {
      artists: [],
      value: '',
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
          this._onChange(input);
        }}
        onSelect={(_value, item) => this.props.onSelect(item)}
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

class Game extends Component {
  constructor(props){
    super(props);
    this.state = {
      currentChallenge: 0,
      totalTime: 0,
      failed: false,
    }
  }

  success(time){
    console.log(time);
    const { currentChallenge, totalTime } = this.state;
    this.setState({currentChallenge: currentChallenge + 1, totalTime: totalTime + time});
  }

  failure(){
    this.setState({ failed: true });
  }

  render(){
    const challenge = this.props.challenges[this.state.currentChallenge];
    if (!challenge) {
      return (
        <b>You Won in {this.state.totalTime} Seconds!!</b>
      )
    }
    if (this.state.failed){
      return (
        <b>You Failed. Better luck next time!</b>
      )
    }
    return (
      <div className="row">
        <GuessChance
          key={challenge.videoId+challenge.artistId}
          videoId={challenge.videoId}
          artistId={challenge.artistId}
          success={this.success.bind(this)}
          failure={this.failure.bind(this)} />
      </div>
    );
  }
}

class CreateForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      challenges: []
    };
  }

  render() {
    return (
      <AristSearch onSelect={console.log}/>
    )
  }
}

class App extends Component {
  constructor(props){
    super(props);
    const challengeJson = atob(window.location.hash.substr(1));
    const challenges = JSON.parse(challengeJson);
    this.state = {
      challenges,
      createMode: true,
    };
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