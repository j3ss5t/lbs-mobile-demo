import "material-design-icons/iconfont/material-icons.css";
import "material-design-icons/iconfont/MaterialIcons-Regular.ttf";
import "material-design-icons/iconfont/MaterialIcons-Regular.woff";
import "material-design-icons/iconfont/MaterialIcons-Regular.woff2";
import "material-design-lite";
import "material-design-lite/dist/material.indigo-pink.min.css";

import { Component, h, render } from "preact";
import { Button, Card, Icon, Layout, Navigation, TextField, Dialog } from "preact-mdl";
import { Router } from "preact-router";

import "./main.css";

const React = { createElement: h };

// Our top-level component.
class App extends Component<{}, {}> {
layout;

get isSmallScreen(): boolean {
    return this.layout.base.classList.contains("is-small-screen");
}

get hasFixedDrawer(): boolean {
    return this.layout.base.classList.contains("mdl-layout--fixed-drawer");
}

handleCalculateRoute = () => {
    alert("You clicked New!");
}

toggleDrawer = () => {
    if (this.hasFixedDrawer && !this.isSmallScreen) {
        return;
    }
    this.layout.base.MaterialLayout.toggleDrawer();
}

render() {
    return (
        <div id="app">
            <Layout fixed-drawer
                    ref={(input) => { this.layout = input; }}>
                <Layout.Content>
                    <Router>
                        <Home path="/" default />
                    </Router>
                </Layout.Content>
            </Layout>
        </div>
    );
}
}

interface RouterProps extends JSX.HTMLAttributes {
default?: boolean;
path: string;
}

interface MyStates {
origin: string;
originLocation?: any;
originLocationName?: string;
originVisible: boolean;
originSearchUrl?: string,
originSearchWS?: WebSocket,
destination: string;
destinationLocation?: any;
destinationLocationName?: string;
destinationVisible: boolean;
destinationSearchUrl?: string;
destinationSearchWS?: WebSocket;
routeWS?: WebSocket;
newRoute?: any;
newRouteVisible: boolean;
newRouteConsumingTime?: string;
newRouteDistance?: string;
guidingAction: 'start' | 'stop';
}

class Home extends Component<RouterProps, MyStates> {
private baseUrl: string = 'ws://127.0.0.1:3000';

constructor(props) {
  super(props);
  this.state = {
    origin: '',
    originVisible: false,
    destination: '',
    destinationVisible: false,
    newRouteVisible: false,
    guidingAction: 'start',
  };

  this.handleChange = this.handleChange.bind(this);
  this.handleCalculateRoute = this.handleCalculateRoute.bind(this);
  this.handleStartStopGuiding = this.handleStartStopGuiding.bind(this);
}

public onopen:(ev:Event) => void = function (event:Event) {};

handleChange(event) {
  const target = event.target;
  const value = target.value;
  const name = target.name;

  this.setState({
    [name]: value
  });

  if(name == 'origin') {
    this.searchLocation(value).then((response)=>{
      let responseHeaders: any = response.headers;
      this.setState({
        originSearchWS: new WebSocket(this.baseUrl)
      });

      this.state.originSearchWS.onmessage = (data) => {
        let object: any = JSON.parse(data.data);

        if(object.type == 'data') {
          if(object.data.results.length > 0) {
            this.setState({
              originLocation: object.data.results[0],
              originLocationName: object.data.results[0].name,
              originVisible: true
            });
          } else {
            this.setState({
              originLocationName: '',
              originVisible: false
            });
          }
        }
      };

      this.state.originSearchWS.onopen = () => {
        this.setState({
          originSearchUrl: responseHeaders.get('location')
        });

        this.state.originSearchWS.send(JSON.stringify({
          type: 'subscribe',
          event: responseHeaders.get('location')
        }));
      };
    });
  }

  if(name == 'destination') {
    this.searchLocation(value).then((response)=>{
      let responseHeaders: any = response.headers;
      this.setState({
        destinationSearchWS: new WebSocket(this.baseUrl)
      });

      this.state.destinationSearchWS.onmessage = (data) => {
        let object: any = JSON.parse(data.data);

        if(object.type == 'data') {
          if(object.data.results.length > 0) {
            this.setState({
              destinationLocation: object.data.results[0],
              destinationLocationName: object.data.results[0].name,
              destinationVisible: true
            });
          } else {
            this.setState({
              destinationLocationName: '',
              destinationVisible: false
            });
          }
        }
      };

      this.state.destinationSearchWS.onopen = () => {
        this.setState({
          destinationSearchUrl: responseHeaders.get('location')
        });

        this.state.destinationSearchWS.send(JSON.stringify({
          type: 'subscribe',
          event: responseHeaders.get('location')
        }));
      };
    });
  }
}

shouldComponentUpdate() {
    return true;
}

createChip(text) {
  return <span class="mdl-chip">
          <span class="mdl-chip__text">{text}</span>
         </span>;
}

calculateRoute(new_origin: any, new_destination: any) {
  return fetch('http://127.0.0.1:3000/routeplanning/routes/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'r' + (Math.random() * (1000 - 1)) + 1,
        origin: new_origin,
        destination: new_destination,
      })
    });
}

handleCalculateRoute(event: any) {
  if(!this.state.originLocation || !this.state.destinationLocation)
  {
    event.preventDefault();
    return;
  }

  this.calculateRoute(
    this.state.originLocation,
    this.state.destinationLocation
  ).then((response) => {
    let responseHeaders: any = response.headers;
    this.setState({
      routeWS: new WebSocket(this.baseUrl)
    });

    this.state.routeWS.onmessage = (data) => {
      let object: any = JSON.parse(data.data);
      if(object.type == 'data' && object.data.consumingTime) {
        this.setState({
          newRouteConsumingTime: object.data.consumingTime,
          newRouteDistance: object.data.distance,
          newRoute: object.data
        });
        this.setState({
          newRouteVisible: true
        });
      }
    };

    this.state.routeWS.onopen = () => {
      this.state.routeWS.send(JSON.stringify({
        type: 'subscribe',
        event: responseHeaders.get('location')
      }));
    };
  });

  if(this.state.guidingAction == 'stop') {
    this.guide('idle');
    //this.setState({guidingAction:'start'});

    setTimeout(()=>{
      this.setState({guidingAction:'start'});
    }, 0);
  }

  event.preventDefault();
}

searchLocation(criteria) {
  return fetch('http://127.0.0.1:3000/locality/searches/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 's' + (Math.random() * (1000 - 1)) + 1,
        needle: criteria
      })
    });
}

handleData(data) {
  let result = JSON.parse(data);
}

handleStartStopGuiding(event) {
  if(this.state.guidingAction == 'start') {
    this.setRoutForGuidance(this.state.newRoute);
    this.guide('guiding');
    //this.setState({guidingAction:'stop'});
    setTimeout(()=>{
      this.setState({guidingAction:'stop'});
    }, 0);
  } else {
    this.guide('idle');
    //this.setState({guidingAction:'start'});
    setTimeout(()=>{
      this.setState({guidingAction:'start'});
    }, 0);
  };

  event.preventDefault();
}

setRoutForGuidance(new_route) {
  return fetch('http://127.0.0.1:3000/routeguidance/guides/d6ebae92-d2c1-11e6-9376-df943f51f0d8', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'idle',
        route: new_route
      })
    });
}

guide(new_status: 'idle' | 'guiding') {
  return fetch('http://127.0.0.1:3000/routeguidance/guides/d6ebae92-d2c1-11e6-9376-df943f51f0d8', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: new_status
      })
    });
}

render() {
    return (
        <Card shadow={4}>
            <Card.Title class="graphic">
                <Card.TitleText>LBS Mobile Demo</Card.TitleText>
            </Card.Title>
            <Card.Text style="text-align:center">
              <div>
                <div>
                  <TextField floating-label
                    name="origin"
                    value={this.state.origin}
                    onChange={this.handleChange}>Origin</TextField>
                </div>
                <div style="text-align:left; padding-left:45px;">
                  {this.state.originVisible ? this.createChip(this.state.originLocationName) : null}
                </div>
                <div>
                  <TextField floating-label
                    name="destination"
                    value={this.state.destination}
                    onChange={this.handleChange}>Destination</TextField>
                </div>
                <div style="text-align:left; padding-left:45px;">
                  {this.state.destinationVisible ? this.createChip(this.state.destinationLocationName) : null}
                </div>
                <div>
                  <TextField
                    readonly
                    value={this.state.newRouteVisible ? 'Distanz: ' + this.state.newRouteDistance + ', Dauer: ' + this.state.newRouteConsumingTime : null}
                    name="route">Info</TextField>
                </div>
              </div>
            </Card.Text>
            <Card.Actions style="text-align:right">
              { this.state.newRouteVisible ?
                <Button onClick={this.handleStartStopGuiding}>Routenführung {this.state.guidingAction == 'start' ? 'starten' : 'stoppen'}</Button> :
                null
              }
              <Button primary onClick={this.handleCalculateRoute}>Route berechnen</Button>
            </Card.Actions>
        </Card>
    );
}
}

render(<App />, document.body);
