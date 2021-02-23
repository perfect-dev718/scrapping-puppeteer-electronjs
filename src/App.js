import React from 'react';
import Mainrouter from './Mainrouter';
import {Router, Switch, Route} from 'react-router-dom';
import history from './utils/history';
import './styles/index.scss';

function App() {
  return (
    <Router basename={`${process.env.PUBLIC_URL}/history`} history={history}>
      <Switch>
        <Route path="/" component={Mainrouter} />
      </Switch>
    </Router>
  );
}

export default App;
