import React, { useState,useEffect } from 'react';
import './App.css';

const BANNER_NAME = "E-BIKE METRICS";
// const terms = {"HR": "Heart Rate",
//               "assist_lvl": "Assist Level",
//               "mode": "Mode"};
// const units = {"HR": "BPM",
//               "assist_lvl": "",
//               "mode": ""}

const App = () => {
  const [ bike, setBike] = useState();
  const [ token, setToken] = useState();
  const [ uid, setUID] = useState();

  const OAUTH_url = 'https://api.swx.altairone.com/oauth2/token';
  const thing_url = 'https://api.swx.altairone.com/spaces/ebike2/collections/esp32_data/things/';
  const API_PATH = 'https://api.swx.altairone.com/';
  const function_path = 'spaces/ebike2/functions/';
  const app_id = 'app::01FXGQS619SXE3AWYBPY3XZBP0';
  const client_secret = 'Sj9oi1lnmrQPsVsGIfrzjhYrrtOyp6';
  const temp_token = 'Bearer TS496lEWxPtbs_zOYOf_Sgeey3_Unsk1fdEulWl_vfc.TdaCm4yxbABmLVG-GRMfvotd0QfCQC74psGa9Z3JxCc';

  useEffect(() => {
    const fetchToken = async () => {
      // Request token for authentication
      const result = await fetch(OAUTH_url,{ 
        method: 'POST',
        body: 'client_id=' + app_id + '&client_secret=' + client_secret + '&grant_type=client_credentials&scope=data',
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
    const fetchUID = async () => {
      const result = await fetch(API_PATH + function_path + 'opentracker/invoke', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'Authorization': token.token_type + ' ' + token.access_token,
          'Authorization': temp_token,
          'Cache-control': 'no-cache',
        }}
      ).catch( err => console.log('GET: something went wrong', err));
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
      setTimeout( () => fetchUID(), 1000);
  });

  useEffect(() => {
    if (uid != 'empty') {
      const fetchBike = async () => {
        const result = await fetch(thing_url + uid + '/properties' , {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // 'Authorization': token.token_type + ' ' + token.access_token,
            'Authorization': temp_token,
            'Cache-control': 'no-cache',
          }
        }).catch( err => console.log('GET: something went wrong', err));

        if (!result.ok) throw result;
        const json = await result.json();
        console.log(json)
        setBike(json);
      }
      setTimeout( () => fetchBike(), 1000);
    }
  });

  async function changeMode(mode) {
    console.log(thing_url + uid + '/properties' )
    const putData = { "username": mode } // *** change back to "mode": mode
    await fetch(thing_url + uid + '/properties/username', {   // *** change back to properties/mode
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // 'Authorization': token.token_type + ' ' + token.access_token,
        'Authorization': temp_token,
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
        // 'Authorization': token.token_type + ' ' + token.access_token,
        'Authorization': temp_token
      },
    })
    .then(data => data.json())
    .then(async data => {
      const uid_temp = data['uid'];
      console.log('uid_temp: ',uid_temp)
      return fetch(API_PATH + function_path + 'updatestate/invoke', {
              method: "POST",
              body: JSON.stringify({"uid": uid_temp, "state": "opened"}),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // 'Authorization': data.token_type + ' ' + data.access_token,
                'Authorization': temp_token
        }
      }).then(response => console.log(response.json()))
        .then(() => setUID(uid_temp));
    })
    .catch( err => console.log('POST: something went wrong', err));
  };

  async function endRide() {
    await fetch(API_PATH + function_path + 'updatestate/invoke', {
      method: "POST",
      body: JSON.stringify({"uid": uid, "state": "closed"}),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // 'Authorization': data.token_type + ' ' + data.access_token,
        'Authorization': temp_token
      }
    });
  };
  if (!uid) {
    return <h1 className="container-fluid">Loading Ride...</h1>;
  } else if (uid == 'empty') {
    return <button onClick={ () => startRide()}>Start Ride</button>
  } else if (!bike) {
    return <h1 className="container-fluid">Loading Metrics...</h1>;
  } else {
    return (
      <div className="container-fluid">
        <Banner title={ BANNER_NAME } />
        <button onClick={ () => changeMode("heart rate") }>Heart rate Mode</button>
        <button onClick={ () => changeMode("power") }>Power Mode</button>
        <PropertyList properties={ (bike) } />
        <button onClick={ () => endRide()} >Finish Ride</button>
      </div>
    );
  }
};

const Banner = ({ title }) => (
  <h2>{ title }</h2>
);

const PropertyList = ({ properties }) => (
  <div className = "property-list">
    { Object.entries(properties).map( ([key, value]) => <Property key = {key} name = {key} value = {value} /> )}
  </div>
)

const Property = ({ name, value }) => (
  <div className="card m-2 p-1">
    <div className="card-body">
      <div className="card-title"> {name} </div>
      <div className="card-text"> 
          {value + "\t" } 
          {/* <div className="card-units"> {name} </div> */}
      </div>
    </div>
  </div>
)

export default App;
