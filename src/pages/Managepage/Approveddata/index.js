import React, {useEffect, useRef, useState} from 'react';
import Layout from '../../../sections/Layout';
import {Button, ButtonGroup, InputGroup, FormControl} from "react-bootstrap";
import {faSearch} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import Completedata from "./Completedata";
import Incompletedata from "./Incompletedata";
import history from "../../../utils/history";

const Approveddata = (props) => {

    const [state, setState] = useState(true);
    const [searchText, setSearchText] = useState('');
    const curRef = useRef(null);

    useEffect(() => {
        curRef.current = true;
        return () => curRef.current = false;
    }, [])

    const onChangeSearch = (e) => {
        setSearchText(e.target.value);
    }

    return (
        <Layout {...props}>
            <div className="text-center pt-0 pb-5 mb-0">
                <div className="text-center">
                    <br/>
                    <ButtonGroup className="mb-0">
                        <Button variant='outline-secondary' style={{borderRadius: "10px 10px 0 0"}}
                                className={!state && "btn-state"}
                                onClick={() => setState(false)}>Incomplete Data</Button>
                        <Button variant='outline-secondary' style={{borderRadius: "10px 10px 0 0"}}
                                className={state && "btn-state"}
                                onClick={() => setState(true)}>Complete Data</Button>
                    </ButtonGroup>
                    <br/>
                    <hr className="mt-0"/>
                    <InputGroup className="mb-5 mt-3">
                        <InputGroup.Prepend>
                            <span className="input-group-text purple lighten-3" id="basic-text1">
                            <FontAwesomeIcon icon={faSearch}/>
                            </span>
                        </InputGroup.Prepend>
                        <FormControl
                            placeholder="Username"
                            aria-label="Username"
                            aria-describedby="basic-addon1"
                            value={searchText}
                            onChange={onChangeSearch}
                        />
                    </InputGroup>
                </div>
                {state ?
                    <Completedata searchText={searchText}/>
                    :
                    <Incompletedata searchText={searchText}/>
                }
                {/*{state && <div className="text-right">
                    <Button variant='outline-secondary' className="mt-3" style={{width: 280, height: 40}}
                            onClick={() => history.push('/')}>
                        Export Data
                    </Button>
                </div>}*/}
            </div>
        </Layout>
    );
}

export default Approveddata;
