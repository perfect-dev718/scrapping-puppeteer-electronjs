import React from 'react';
import {Switch, Redirect, Route} from 'react-router-dom';
import Mainpage from './pages/Mainpage';
import Managepage from "./pages/Managepage";
import Scrapingpage from "./pages/Scrapingpage";
import Autoscrape from "./pages/Scrapingpage/Autoscrape";
import Newdata from "./pages/Managepage/Newdata";
import Approveddata from "./pages/Managepage/Approveddata";
import Manualupload from "./pages/Scrapingpage/Manualupload";

const Mainrouter = (props) => {
  return (<Switch>
    <Redirect
      from={`${process.env.PUBLIC_URL}/`}
      to={`${process.env.PUBLIC_URL}/main`}
      exact
    />
    <Route
      path={`${process.env.PUBLIC_URL}/main`}
      component={Mainpage}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/manage`}
        component={Managepage}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/scraping`}
        component={Scrapingpage}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/autoscrape`}
        component={Autoscrape}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/newdata`}
        component={Newdata}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/approveddata`}
        component={Approveddata}
    />
    <Route
        path={`${process.env.PUBLIC_URL}/manualupload`}
        component={Manualupload}
    />
  </Switch>);
}

export default Mainrouter;
