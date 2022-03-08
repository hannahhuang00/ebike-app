import React, { useState,useEffect } from 'react';
import './App.css';

const BANNER_NAME = "E-BIKE METRICS";

const TERMS = {"assist_level": "Assist Level",
               "bpm": "Heart rate",
               "calories_burned": "Calories Burned",
               "power": "Power",
               "mode": "Mode",
              };

const UNITS = {"bpm": "BPM",
               "calories_burned": "Calories",
               "power": "Watts",
              };


const App = () => {
  const [ bike, setBike] = useState();
  const [ token, setToken] = useState();
  const [ uid, setUID] = useState();

  const thing_url = 'spaces/ebike2/collections/esp32_data/things/';
  const API_PATH = 'https://api.swx.altairone.com/';
  const function_path = 'spaces/ebike2/functions/';
  const app_id = 'app::01FXGQS619SXE3AWYBPY3XZBP0';
  const client_secret = 'rLAwUUofwjfHYEfeOCL9gWmLnTuH4g';


  useEffect(() => {
    const fetchToken = async () => {
      // Request token for authentication
      const result = await fetch(API_PATH + 'oauth2/token',{ 
        method: 'POST',
        body: 'client_id=' + app_id + '&client_secret=' + client_secret 
              + '&grant_type=client_credentials&scope=function+data+thing',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }})
        .catch( err => console.log('POST: something went wrong', err));
      console.log(result)
      if (!result.ok) throw result;
      const json = await result.json();
      console.log(json)
      setToken(json);
    }
    fetchToken();
  },[])

  // FIND OPEN THING
  useEffect(() => {
    // console.log('hi')
    if (token){
      const fetchUID = async () => {
        const result = await fetch(API_PATH + function_path + 'opentracker/invoke', {
          method: 'POST',
          body: '{}',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': token.token_type + ' ' + token.access_token,
            // 'Authorization': temp_token,
            'Cache-control': 'no-cache',
          }}
        )
        .catch( err => console.log('GET: something went wrong', err));
        
        // console.log("ln 58")
        if (!result.ok) throw result;
        const json = await result.json();
        console.log("open tracker:", json)
      
        if (json['data'].length == 0) {
          setUID('empty')
          console.log("no open things found")
        } else {
          setUID(json['data'][0]['uid']);
          console.log("open things found")
        }
      }
        setTimeout( () => fetchUID(), 2000);
    }
  });

  useEffect(() => {
    if (uid != 'empty' && token) {
      const fetchBike = async () => {
        const result = await fetch(API_PATH + thing_url + uid + '/properties' , {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': token.token_type + ' ' + token.access_token,
            // 'Authorization': temp_token,
            'Cache-control': 'no-cache',
          }
        }).catch( err => console.log('GET: something went wrong', err));

        if (!result.ok) throw result;
        const json = await result.json();
        // console.log(json)
        setBike(json);
      }
      setTimeout( () => fetchBike(), 1000);
    }
  });

  async function changeMode(mode) {
    console.log(API_PATH + thing_url + uid + '/properties' )
    const putData = { "username": mode } // *** change back to "mode": mode
    await fetch(API_PATH + thing_url + uid + '/properties/username', {   // *** change back to properties/mode
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': token.token_type + ' ' + token.access_token,
        // 'Authorization': temp_token,
      },
      body: JSON.stringify(putData)
    }).catch( err => console.log('POST: something went wrong', err));
    console.log("Mode set to " + mode);
  };

  async function startRide() {
    await fetch(API_PATH + function_path + 'start/invoke', {
      method: 'POST',
      body: JSON.stringify({"model": {"name": "user_ride","version": 1}}),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': token.token_type + ' ' + token.access_token,
        // 'Authorization': temp_token
      },
    })
    .then(data => data.json())
    .then(async data => {
      const uid_temp = data['uid'];
      console.log('uid_temp: ',uid_temp)
      await fetch(API_PATH + function_path + 'updateproperties/invoke', {
              method: "POST",
              body: JSON.stringify({"uid": uid_temp, "properties": {
                "assist_level": 0 ,
                "bpm": 100,
                "calories_burned": 0,
                "power": 0,
                // "mode": "Heart rate Mode",
                "username": "Mark",
                "state": "opened"
              }}),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': token.token_type + ' ' + token.access_token,
                // 'Authorization': temp_token
        }
      })
      .then( () => setUID(uid_temp))
      .catch( err => console.log('updatestate: something went wrong', err) )
    })
    .catch( err => console.log('POST: something went wrong', err) );
  };

  async function endRide() {
    await fetch(API_PATH + function_path + 'updatestate/invoke', {
      method: "POST",
      body: JSON.stringify({"uid": uid, "state": "closed"}),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': token.token_type + ' ' + token.access_token,
        // 'Authorization': temp_token
      }
    });
  };

  // const bike_props = propInMaster(bike);
  // console.log(bike_props)

  if (!uid) {
    return <h1 className="container-fluid">Finding Ride...</h1>;
  } else if (uid == 'empty') {
    return (
      <div className="container-fluid">
        <h1>No Ride Found.</h1>
      <button className="ride-button" onClick={ () => startRide()}>Start Ride</button>
      </div>
    )
  } else if (!bike) {
    return <h1 className="container-fluid">Loading Metrics...</h1>;
  } else {
    return (
      <div className="container-fluid">
        <Banner title={ BANNER_NAME } user={bike["username"]} />
        <button onClick={ () => changeMode("heart rate") }>Heart rate Mode</button>
        <button onClick={ () => changeMode("power") }>Power Mode</button>
        <PropertyList properties={ propInMaster(bike) } />
        <button onClick={ () => endRide() }>Finish Ride</button>
      </div>
    );
  }
};

const Banner = ({ title, user }) => (
  <div className="user-text">
    <h2 className="user-line">{ user.toUpperCase() + "'S" }</h2>
    <h2 className="user-line">&nbsp; { title }</h2>
  </div>
  
);

const PropertyList = ({ properties }) => (
  <div className = "property-list">
    { Object.entries( properties ).map( ([key, value]) => <Property key = {key} name = {key} value = {value} /> ) }
  </div>
)

function propInMaster( properties ) {
  const property_keys_ = Object.keys(properties);
  const master_keys_ = Object.keys(TERMS);
  const property_in_master = {};
  for (let i=0; i<property_keys_.length; i++) {
    for (let j=0; j<master_keys_.length; j++) {
      if (property_keys_[i] == master_keys_[j]) {
        property_in_master[master_keys_[j]] = properties[property_keys_[i]];
      }
    }
  }
  return property_in_master;
}

const Property = ({ name, value }) => (
  <div className="card m-2 p-1">
    <div className="card-body">
      <div className="card-title"> {TERMS[name]} </div>
      <div className="card-text"> 
          {value + "\t" } 
          <div className="card-units"> {UNITS[name]} </div>
      </div>
    </div>
  </div>
)

export default App;
