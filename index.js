'use strict'

const fs            = require('fs');
const EventEmitter  = require('events');
const puppeteer     = require('puppeteer');
const ObjectsToCsv  = require('objects-to-csv');

/**
 * @class
 * @name CrawlerThread
 * @description The class for crawler threads
 */
class CrawlerThread extends EventEmitter
{
    /**
     * @constructor
     * @param {string} id The id of the thread
     * @param {string} parent the parent of the thread
     * @param {Browser} browser The browser for the thread to use
     * @param {Boolean} debug Whether the thread should print debug messages
     */
    constructor(id, parent, browser, debug=false)
    {
        super();

        this.id = id;

        this.busy = true;

        this.parent = parent;
        this.browser = browser;

        this.debug = debug;
        this.logger = new Logger(debug, `Worker ${this.id} `);
    }

    /**
     * @function
     * @name setup
     * @description Creates a tab for the thread to use
     */
    async setup()
    {
        this.logger.logDebug('Opening new tab');
        this.page = await this.browser.newPage();

        this.logger.logDebug('Hooking network requests');
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {

            if (
                request.resourceType() === 'image' ||
                request.resourceType() === 'stylesheet' ||
                (request.resourceType() === 'script' && request.url() !== 'https://staticserve.plasam.host/jquery.min.js')
            )
            {
                request.abort();
            }
            else
            {
                request.continue();
            };
        });

        this.ready = true;
    }

    /**
     * @function
     * @name shutdown
     * @description Closes the browser tab of the thread
     */
    async shutdown()
    {
        if(this.ready)
        {
            this.ready = false;
            try
            {
                await this.page.close();
            }
            catch(err)
            {
                this.logger.logDebug('Failed to close page');
            }
        }
    }

    /**
     * @function
     * @name processPage
     * @description Scrapes all links and contacts off a given page
     * @param {String} url
     * @param {Number} level The depth of the crawl
     */
    async processPage(url, level)
    {
        if(!this.ready)
        {
            throw new Error('Not ready.');
        }

        this.url = url

        this.busy = true;

        let _this = this;
        this.timeout = setTimeout(() => {

            _this.logger.logNegative(`${url} took too long to process skipping`);

            _this.busy = false;

            _this.emit('processedPage');
        }, 40 * 1000);

        try
        {
            this.logger.logDebug(`Going to: ${url} level ${level}`);
            await this.page.goto(url);

            this.logger.logDebug('Injecting jquery 3.5.1');
            await this.page.addScriptTag({url:'https://staticserve.plasam.host/jquery.min.js'});

            await this.findAllLinks(url, level);
            await this.findAllContacts(url);
        }
        catch(err)
        {
            if(this.debug)
            {
                console.log('-----------------= Error =-----------------');
                console.log(err);
                console.log('-------------------------------------------');
            }
            this.logger.logNegative(`Error processing ${url}, skipping`);
        }
        finally
        {
            clearTimeout(_this.timeout);

            _this.logger.logInfo(`Finshed processing ${url}`);
            _this.busy = false;

            this.emit('processedPage');
        }
    }

    /**
     * @function
     * @name findAllLinks
     * @description Finds all internal links of the current page
     * @param {String} url
     * @param {Number} level The depth of the crawl
     */
    async findAllLinks(url, level)
    {

        this.logger.logDebug('Finding all links');

        let links = await this.page.evaluate(function (_) {
            let links = [];
            // Iterate every link on page
            $('a').each(function(){
                // Check if the link is valid
                if($(this).attr('href') && $(this).attr('href').length > 1)
                {

                    links.push(this.href);
                    //links.push($(this).prop('pathname'));

                    // Check if the link is internal
                    //if( window.location.hostname === $(this).prop('hostname'))
                }
            });

            return links;

        });

        this.emit('links', links, level);
    }

    /**
     * @function
     * @name findAllContacts
     * @description Finds all contacts on the current page
     * @param {String} url current page URL
     */
    async findAllContacts(url)
    {

        this.logger.logDebug('Finding all contacts');

        // Evaluate contact finding js
        let contacts = await this.page.evaluate(function (_) {
            let people = [];
            let emailLookup = [];

            // Iterate all links to find mailto:
            $('a').each(function(){

                // Check if link is valid
                let link = $(this).attr('href');
                if(link && link.includes('mailto:'))
                {
                    // Find the email component
                    let email = $(this).attr('href').split(':')[1];

                    // Check if it's long enough
                    if(email.length < 5)
                    {
                        return;
                    }

                    // Setup contact based on email
                    people.push({email: email});
                    emailLookup[email] = people.length - 1;
                    people[emailLookup[email]].name = '';
                    people[emailLookup[email]].job = '';
                    people[emailLookup[email]].phone = '';

                    // Guess the name of the individual by taking the first component of the email
                    guessed_name = email.split('.')[0].split('-')[0];

                    // Setup regex to use the guessed name
                    let regex = new RegExp(`(( |&nbsp(\;)*|\\.){0,2}[a-z]*){0,2}${guessed_name}(( |&nbsp(\;)*)?[a-z]*)*`, 'i');

                    let base = $(this);
                    let current = base;
                    // Iterate parents of the found object
                    for(let i = 0; i < 4; i++)
                    {
                        current = current.parent();

                        // Check if the can find a match
                        if(!current.html().match(regex))
                        {
                            continue;
                        }

                        // Get match
                        let name = current.html().match(regex)[0];

                        // Regex tidying
                        name = name.replace(/&nbsp(\;)*/g, ' ');

                        // Validate name and place in lookup
                        if(name.length > 1 && name != guessed_name)
                        {
                            people[emailLookup[email]].name = name;
                            break;
                        }
                    }

                    let roles = [
                        "director",
                        "officer",
                        "chief",
                        "minister",
                        "coordinator",
                        "head",
                        "assistant",
                        "secretary",
                        "manager",
                        "executive",
                        "secretariat",
                    ];


                    current = base;
                    for(let i = 0; i < 4; i++)
                    {
                        current = current.parent();

                        regex = new RegExp(email);
                        let index = 0;
                        if(regex.exec(current.html()))
                        {
                            index = regex.exec(current.html()).index;
                        }
                        let bestindex = 9999999;
                        let bestmatch = null;
                        let phoneFound = false;
                        let phoneIndex = 999999;
                        let phoneBestMatch = null;
                        for(let j = 0; j < roles.length; j++)
                        {
                            regex = new RegExp(`[A-Za-z," \(\)]*${roles[j]}[A-Za-z," \(\)]*`,'ig');
                            let html = current.html();

                            let phoneRegex = new RegExp('(\\+?\\d+ ?\/?){5,15}', 'g');
                            if(!phoneFound)
                            {
                                while ((match = phoneRegex.exec(html)) != null)
                                {
                                    if(Math.abs(match.index - index) < phoneIndex)
                                    {
                                        phoneFound = true;
                                        phoneIndex = Math.abs(match.index - index)
                                        console.log(match[0]);
                                        phoneBestMatch = match[0];
                                    }
                                }
                            }

                            html = current.html();

                            while ((match = regex.exec(html)) != null) {
                                if(match.index - index < 0 && Math.abs(match.index - index) < bestindex)
                                {
                                    bestindex = Math.abs(match.index - index)
                                    console.log(match[0]);
                                    bestmatch = match[0];
                                }
                            }
                        }

                        if(phoneIndex < 9999999)
                        {
                            people[emailLookup[email]].phone = phoneBestMatch;
                        }

                        if(bestindex < 9999999)
                        {
                            people[emailLookup[email]].job = bestmatch;
                        }
                    }

                }
            });

            console.log("DONE!")

            return people;
        });


        for(let i = 0; i < contacts.length; i++)
        {
            let contact = contacts[i];
            contact.source = url;
        }

        let temp = new URL(url);
        let hostname = temp.hostname;

        this.emit('contacts', hostname, contacts);
    }
}

/**
 * @class
 * @name Crawler
 * @description A crawler
 */
class Crawler extends EventEmitter
{
    /**
     * @constructor
     * @param {Boolean} debug Whether the crawler should print debug messages
     */
    constructor(debug=false)
    {
        super();

        // Create a constant reference to this
        let _this = this;

        // Initialisation
        this.debug = debug;
        this.logger = new Logger(debug);
        this.threads = 64;
        this.workers = [];
        this.visited = [];
        this.targets = {};
        this.contactsEmailLookup = {};
        this.contacts = [];
        this.contactsCount = {};

        // Launch the browser
        this.logger.logDebug('Launching browser');
        puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']}).then((browser)=>{

            // Store reference to the created browser
            _this.browser = browser;

            // Emit ready
            _this.logger.logDebug('Ready!');
            _this.emit('ready');
        });

        // Listen for when the crawler has finished
        this.on('finished', () => {
            // Close the browser
            _this.browser.close();
        })
    }

    /**
     * @function
     * @name createNewWorker
     * @description Creates a new worker thread
     * @param {String} url the url for the thread to use
     * @param {Number} level The depth of the crawl
     */
    async createNewWorker(url, level)
    {

        // Create new thread
        this.logger.logDebug('Creating new worker');
        let worker = new CrawlerThread(this.workers.length + 1, this, this.browser, this.debug);

        // Save worker
        this.workers.push(worker);

        // Setup worker
        await worker.setup();

        // Store reference to this
        let _this = this;

        // Listen for links
        worker.on('links', (links, level) => {

            // Iterate all received links
            for(let i = 0; i < links.length; i++)
            {
                let link = links[i];

                // List of undesireable file extensions
                let blockedextensions = [
                    '.pdf',
                    '.jpg',
                    '.JPG',
                    '.jpeg',
                    '.JPEG',
                    '.png',
                    '.zip',
                    '.doc',
                    '.docx',
                    '.ppt',
                    '.rar',
                    '.mp3',
                    '.mp4',
                    '.DOCX',
                    '.PDF',
                    '.xml',
                    '.XML',
                    '.xls',
                    '.XLS',
                    '.pptx',
                    '.PPTX',
                    '.xlsx',
                    '.wma',
                    '.vcf'
                ]

                // Check if link ends in an undesirable file extension
                let dissallowed = false;
                for(let j = 0; j < blockedextensions.length; j++)
                {
                    let extension = blockedextensions[j];
                    if(link.endsWith(extension))
                    {
                        dissallowed = true;
                        break;
                    }
                }

                // Skip if file extension is not allowed

                if(dissallowed)
                {
                    continue;
                }

                link = link.split('#')[0];

                let blacklistedWords = [
                    'google',
                    'bing',
                    'yahoo',
                    'wikipedia',
                    'imgur',
                    'itunes',
                    'youtube',
                    'linux',
                    'javascript:',
                    'axigen',
                    'dovecot',
                    'mozilla',
                    'twitter',
                    'microsoft'
                ]

                for(let j = 0; j < blacklistedWords.length; j++)
                {
                    let word = blacklistedWords[j];
                    if(link.includes(word))
                    {
                        _this.logger.logDebug(`Skipping ${link} Contains blacklisted word`);
                        dissallowed = true;
                        break;
                    }
                }

                if(dissallowed)
                {
                    continue;
                }

                // Check the link has not been visited and is not waiting to be visited and contains less than 6 /
                if(_this.visited.indexOf(link) < 0 && Object.keys(_this.targets).indexOf(link) < 0 && link.split('/').length < 6 && level < 5)
                {
                    // Save target for later
                    _this.logger.logDebug(`Found new target ${link}`)
                    _this.targets[link] = level + 1;
                }
            }
        });

        // Listen for contacts
        worker.on('contacts', (hostname, contacts) => {

            // Iterate all received contacts
            for(let i = 0; i < contacts.length; i++)
            {
                let contact = contacts[i];

                // Check if email already exists
                if(!_this.contactsEmailLookup[contact.email])
                {

                    // Save contact
                    _this.logger.logDebug(`Found new contact (${contact.email})`);
                    _this.contacts.push(contact);
                    _this.contactsEmailLookup[contact.email] = _this.contacts.length - 1;

                    if(!_this.contactsCount[hostname])
                    {
                        _this.contactsCount[hostname] = 0;
                    }
                    _this.contactsCount[hostname]++;
                }
            }
        });

        // Listen for a processedPage
        worker.on('processedPage', () => {

            // Assume we are finished unless we find evidence to suggest otherwise
            let finished = true;

            // Check if we have more targets to visit
            if(Object.keys(_this.targets).length > 0)
            {
                finished = false;
            }

            let workersBusy = 0;

            // Iterate workers
            for(let i = 0; i < _this.workers.length; i++)
            {
                let worker = _this.workers[i];

                if(worker.busy)
                {
                    workersBusy++;

                    // If workers are still busy we are not finished
                    finished = false;
                    continue;
                }

                // If worker is not busy and we still have targets
                if(Object.keys(_this.targets).length > 0)
                {

                    // Get first recent target
                    let target = Object.keys(_this.targets)[0];
                    let level = _this.targets[target];

                    // Move to visited
                    delete _this.targets[target];
                    _this.visited.push(target);


                    worker.busy = true;
                    // Process target
                    setTimeout(
                        async function()
                        {
                            try
                            {
                                worker.processPage(target, level)
                            }
                            finally{}
                        },
                        500
                    );

                    _this.logger.logInfo(`${Object.keys(_this.targets).length} targets left`);
                }

            }

            this.logger.logDebug(`${workersBusy} workers currently busy`);

            // Check if we are using the maximum number of workers and if we need more
            while(Object.keys(_this.targets).length > 0 && _this.workers.length < _this.threads)
            {
                // Get first recent target
                let target = Object.keys(_this.targets)[0];
                let level = _this.targets[target];

                // Move to visited
                delete _this.targets[target];
                _this.visited.push(target);

                // Create new worker and process target
                _this.createNewWorker(target, level);

                _this.logger.logInfo(`${_this.targets.length} targets left`);
            }

            // Check if finished
            if(finished)
            {

                // Emit finished
                _this.emit('finished');

                console.log(_this.contactsCount);

                // Iterate workers
                for(let i = 0; i < _this.workers.length; i++)
                {
                    let worker = _this.workers[i];

                    // Shutdown worker
                    worker.shutdown();
                }
            }
        });

        // Process url
        worker.processPage(url, level);
    }

    /**
     * @function
     * @name crawl
     * @description Tell the crawler which url to crawl recursively
     * @param {String} base The base url
     */
    async crawl(base)
    {
        // Save reference to base
        this.base = base;

        // Create first worker
        this.createNewWorker(base, 0);
    }

    /**
     * @function
     * @name save
     * @description Save the crawlers results
     */
    async save()
    {
        this.logger.logDebug('Saving results...');

        // Convert contacts to CSV
        const csv = new ObjectsToCsv(this.contacts);

        // Save csv
        await csv.toDisk(`output/${this.base.split('//')[1]}.csv`);
    }

}

/**
 * @class
 * @name WebScraper
 * @description Scrapes webpages
 */
class WebScraper extends EventEmitter
{

    /**
     * @constructor
     * @param {Boolean} debug Whether the WebScraper should print debug messages
     */
    constructor(debug=false)
    {
        // Call EventEmitter constructor
        super();

        // Initialisation
        this.debug = debug
        this.results = {};
        this.logger = new Logger(debug);
        this.crawlers = [];

        // Emit ready
        this.emit('ready');

        this.logger.logDebug('Created new Scraper');
    }

    /**
     * @function
     * @name crawl
     * @description Crawl url
     * @param {String} url Url to crawl
     */
    async crawl(url)
    {

        // Save current Url
        this.url = url;

        // Check if page has already been crawled
        if(fs.existsSync(`output/${this.url.split('//')[1]}.csv`))
        {

            // Skip if already crawled
            this.logger.logInfo(`Already crawled ${url} skipping`);
            this.emit('finished');
            return;
        }

        this.logger.logInfo(`Starting crawl of ${url}`)

        // Save reference to this
        let _this = this;

        // Create new crawler
        let crawler = new Crawler(this.debug);

        // Save reference to the crawler
        this.crawlers.push(crawler);

        // Listen for when the crawler is ready
        crawler.on('ready', async () =>{

            // Crawl the url
            await crawler.crawl(url);

            // Listen for when the crawler is finished
            crawler.on('finished', () => {

                _this.logger.logInfo('=====================================');
                _this.logger.logInfo(`Finished crawling ${url}`);
                _this.logger.logInfo(`Found ${crawler.contacts.length} contacts`);
                _this.logger.logInfo(`Crawled ${crawler.visited.length} pages`);
                _this.logger.logInfo('=====================================');

                // Emit finished
                _this.emit('finished');

                // Save crawlers results
                crawler.save();

            });
        });

    }

    /**
     * @function
     * @name save
     * @description Saves the current WebScrapers crawlers to a file
     * @param {String} file The name of the file to save to
     */
    async save(file)
    {
        this.logger.logDebug('Saving results...');

        // Concat all contacts from all crawlers
        let contacts = [];
        for(let i = 0; i < this.crawlers.length; i++)
        {
            let crawler = this.crawlers[i];
            contacts = contacts.concat(crawler.contacts);
        };

        // Convert to CSV
        const csv = new ObjectsToCsv(contacts);

        // Save results
        await csv.toDisk(file);

        return;
    }
}

/**
 * @class
 * @name Logger
 * @description Logger for outputs
 */
class Logger
{

    /**
     * @constructor
     * @param {Boolean=} debug Should the logger print debug messages
     * @param {String=} prefix Whether the logger should us a prfix
     */
    constructor(debug=false, prefix='')
    {
        this.debug = debug
        this.prefix = prefix;
    }

    /**
     * @function
     * @name logDebug
     * @description Log a debug message
     * @param {String} msg message to log
     */
    logDebug(msg)
    {
        if(this.debug)
        {
            console.log(`[${this.prefix}*] ${msg}`);
        }
    }

    /**
     * @function
     * @name logPositive
     * @description Log a positive message
     * @param {String} msg message to log
     */
    logPositive(msg)
    {
        console.log(`[${this.prefix}+] ${msg}`);
    }

    /**
     * @function
     * @name logNegative
     * @description Log a negative message
     * @param {String} msg message to log
     */
    logNegative(msg)
    {
        console.log(`[${this.prefix}-] ${msg}`);
    }

    /**
     * @function
     * @name logInfo
     * @description Log an informational message
     * @param {String} msg message to log
     */
    logInfo(msg)
    {
        console.log(`[${this.prefix}.] ${msg}`);
    }
}

let scraper = new WebScraper(true);


let urls = [
    'http://gov.ai',
    /*'http://minint.gov.ao',
     'http://gov.ai',
     'http://fsc.org.ai',
     'http://antigua.gov.ag',
     'http://ab.gov.ag',
     'http://bplco.com',
     'http://centralbankbahamas.com',
     'http://icb.gov.bs',
     'http://gov.bs',
     'http://urcabahamas.bs',
     'http://bahamas.gov.bs',
     'http://scb.gov.bs',
     'http://wsc.com.bs',
     'http://nib-bahamas.com ',
     'http://bahrainedb.com',
     'http://moe.gov.bh',
     'http://csb.gov.bh',
     'http://noga.gov.bh',
     'http://ewa.bh',
     'http://baec.gov.bd',
     'http://berc.org.bd',
     'http://btrc.gov.bd',
     'http://idra.org.bd',
     'http://mofa.gov.bd',
     'http://parliament.gov.bd',
     'http://mopa.gov.bd',
     'http://mop.gov.bd',
     'http://egcb.gov.bd',
     'http://bfsa.gov.bd',
     'http://secbd.org',
     'http://barbados.gov.bb',
     'http://fsc.gov.bb',
     'http://ifsc.gov.bz',
     'http://bna.gov.bz',
     'http://bma.bm',
     'http://gov.bm',
     'http://parliament.bm',
     'http://ra.bm',
     'http://bocra.org.bw',
     'http://gov.bw',
     'http://bera.co.bw',
     'http://nbfira.org.bw',
     'http://bvifsc.vg',
     'http://gov.vg',
     'http://bviddm.com',
     'http://bvielectricity.com',
     'http://mfa.bg',
     'http://cik.bg',
     'http://gov.bg',
     'http://aer.ca',
     'http://asc.ca',
     'http://bcfsa.ca',
     'http://bcsc.bc.ca',
     'http://cdic.ca',
     'http://cer-rec.gc.ca',
     'http://fsrao.ca',
     'http://gov.nt.ca',
     'http://gov.ab.ca',
     'http://canada.ca',
     'http://leg.gov.mb.ca',
     'http://gov.nl.ca',
     'http://gov.ns.ca',
     'http://novascotia.ca',
     'http://assembly.ab.ca',
     'http://ola.org',
     'http://leg.bc.ca',
     'http://osfi-bsif.gc.ca',
     'http://osc.gov.on.ca',
     'http://parl.gc.ca',
     'http://assembly.pe.ca',
     'http://gov.yk.ca',
     'http://assembly.nu.ca',
     'http://ontla.ola.org',
     'http://legassembly.sk.ca',
     'http://gov.ky',
     'http://cima.ky',
     'http://caacayman.com',
     'http://electionsoffice.ky',
     'http://icta.ky',
     'http://ofreg.ky',
     'http://waterauthority.ky',
     'http://oag.gov.ky',
     'http://dci.gov.ky',
     'http://anticorruptioncommission.ky',
     'http://caymanera.ky',
     'http://has.ky',
     'http://cysec.gov.cy',
     'http://parliament.cy',
     'http://dominica.gov.dm',
     'http://falklands.gov.uk',
     'http://sec.gov.fk',
     'http://undp.org',
     'http://un.org',
     'http://govnet.gov.fj',
     'http://nca.org.gh',
     'http://npa.gov.gh',
     'http://parliament.gh',
     'http://petrocom.gov.gh',
     'http://bog.gov.gh',
     'http://energycom.gov.gh',
     'http://gra.gov.gh',
     'http://nicgh.org',
     'http://purc.com.gh',
     'http://sec.gov.gh',
     'http://mofep.gov.gh',
     'http://mint.gov.gh',
     'http://mfa.gov.gh',
     'http://moc.gov.gh',
     'http://moh.gov.gh',
     'http://ndpc.gov.gh',
     'http://mopa.gov.gh',
     'http://mojagd.gov.gh',
     'http://moti.gov.gh',
     'http://mwh.gov.gh',
     'http://gnra.org.gh',
     'http://gibraltar.gov.gi',
     'http://parliament.gi',
     'http://procurement.gov.gi',
     'http://gov.gd',
     'http://garfin.gd',
     'http://cicra.gg',
     'http://gfsc.gg',
     'http://gov.gg',
     'http://deputies.gov.gg',
     'http://finance.gov.gy ',
     'http://minfor.gov.gy',
     'http://parliament.gov.gy',
     'http://moc.gov.gy',
     'http://mopi.gov.gy',
     'http://nre.gov.gy ',
     'http://sdnp.org.gy',
     'http://icetra.is',
     'http://pmo.is',
     'http://mfa.is',
     'http://skipulag.is',
     'http://os.is',
     'http://bis.gov.in',
     'http://dghindia.gov.in',
     'http://pngrb.gov.in',
     'http://rbi.org.in',
     'http://aviationreg.ie',
     'http://welfare.ie',
     'http://health.gov.ie',
     'http://dbei.gov.ie',
     'http://taoiseach.gov.ie',
     'http://dublincity.ie',
     'http://fsai.ie',
     'http://hsa.ie',
     'http://oireachtas.ie',
     'http://hpra.ie',
     'http://dfa.ie',
     'http://lawsociety.ie',
     'http://medicalcouncil.ie',
     'http://ogp.gov.ie',
     'http://qqi.ie',
     'http://revenue.ie',
     'http://rsa.ie',
     'http://pensionsauthority.ie',
     'http://wdc.ie',
     'http://lsra.ie',
     'http://gov.im',
     'http://doe.gov.im',
     'http://tynwald.org.im',
     'http://Highways.gov.im',
     'http://auditorgeneral.gov.jm',
     'http://bsj.org.jm',
     'http://ecj.com.jm',
     'http://fscjamaica.org',
     'http://mot.gov.jm',
     'http://mns.gov.jm',
     'http://nwc.com.jm',
     'http://cabinet.gov.jm',
     'http://our.org.jm',
     'http://japarliament.gov.jm',
     'http://opm.gov.jm',
     'http://megjc.gov.jm',
     'http://mwlecc.gov.jm',
     'http://mfaft.gov.jm',
     'http://moj.gov.jm',
     'http://moey.gov.jm',
     'http://miic.gov.jm',
     'http://moa.gov.jm',
     'http://nepa.gov.jm',
     'http://jcf.gov.jm',
     'http://agc.gov.jm',
     'http://mica.gov.jm',
     'http://micaf.gov.jm',
     'http://mlss.gov.jm',
     'http://moh.gov.jm',
     'http://mcges.gov.jm',
     'http://mlgcd.gov.jm',
     'http://mtw.gov.jm',
     'http://mtm.gov.jm',
     'http://mstem.gov.jm',
     'http://mset@gov.jm',
     'http://boj.org.jm',
     'http://bglc.gov.jm',
     'http://jcaa.gov.jm',
     'http://cicra.je',
     'http://gov.je',
     'http://jerseyfsc.org',
     'http://iom.int',
     'http://mwi.gov.jo',
     'http://cma.or.ke',
     'http://centralbank.go.ke',
     'http://ca.go.ke',
     'http://ira.go.ke',
     'http://kaa.go.ke',
     'http://kebs.org',
     'http://kengen.co.ke',
     'http://kra.go.ke',
     'http://odpp.go.ke',
     'http://ombudsman.go.ke',
     'http://parliament.go.ke',
     'http://mfa.go.ke',
     'http://jsc.go.ke',
     'http://judiciary.go.ke',
     'http://ourt.go.ke',
     'http://coordination.go.ke',
     'http://psyg.go.ke',
     'http://information.go.ke',
     'http://ict.go.ke',
     'http://industrialization.go.ke ',
     'http://ngeckenya.org',
     'http://publicservice.go.ke',
     'http://npsc.go.ke',
     'http://cle.or.ke',
     'http://copyright.go.ke',
     'http://nationalpolice.go.ke',
     'http://rba.go.ke',
     'http://nema.go.ke',
     'http://kenha.co.ke',
     'http://posta.co.ke',
     'http://kenyaforestservice.org',
     'http://treasury.go.ke',
     'http://wasreb.go.ke',
     'http://parliament.gov.ki',
     'http://cma.gov.kw',
     'http://epa.org.kw',
     'http://scpd.gov.kw',
     'http://kdipa.gov.kw',
     'http://kia.gov.kw',
     'http://pm.gov.kw',
     'http://cmgs.gov.kw',
     'http://moo.gov.kw',
     'http://mod.gov.kw',
     'http://dgca.gov.kw',
     'http://nbaq.edu.kw',
     'http://moj.gov.kw',
     'http://mgrp.org.kw',
     'http://kmun.gov.kw',
     'http://nazaha.gov.kw',
     'http://kuwait-fund.org',
     'http://lca.org.ls',
     'http://gov.ls',
     'http://iec.gov.ls',
     'http://lewa.org.ls',
     'http://cftc.mw',
     'http://energy.gov.mw',
     'http://myipo.gov.my',
     'http://hasil.gov.my',
     'http://moe.gov.my',
     'http://moh.gov.my',
     'http://mohr.gov.my',
     'http://epu.gov.my',
     'http://parlimen.gov.my',
     'http://penang.gov.my',
     'http://selangor.gov.my',
     'http://ssm.com.my',
     'http://mycc.gov.my',
     'http://johor.gov.my',
     'http://mmk.kedah.gov.my',
     'http://kedah.gov.my',
     'http://kelantan.gov.my',
     'http://melaka.gov.my',
     'http://ns.gov.my',
     'http://pahang.gov.my',
     'http://perak.gov.my',
     'http://perlis.gov.my',
     'http://sabah.gov.my',
     'http://sarawak.gov.my',
     'http://jmp.gov.my',
     'http://mod.gov.my',
     'http://mampu.gov.my',
     'http://jpa.gov.my',
     'http://spa.gov.my',
     'http://mestecc.gov.my',
     'http://treasury.gov.my',
     'http://kkmm.gov.my',
     'http://kln.gov.my',
     'http://kkr.gov.my',
     'http://kbs.gov.my',
     'http://moha.gov.my',
     'http://miti.gov.my',
     'http://mpi.gov.my',
     'http://mot.gov.my',
     'http://kats.gov.my',
     'http://kbs.gov.my',
     'http://kpwkm.gov.my',
     'http://seccom.com.my',
     'http://jkptg.gov.my',
     'http://skm.gov.my',
     'http://moha.gov.my',
     'http://mpc.gov.my',
     'http://kwpk.sarawak.gov.my',
     'http://mga.org.mt',
     'http://parliament.mt',
     'http://gov.mt',
     'http://ba.org.mt',
     'http://fscmauritius.org',
     'http://govmu.org',
     'http://osce.org',
     'http://mrs.gov.me',
     'http://gsv.gov.me',
     'http://gov.ms',
     'http://mireme.gov.mz',
     'http://inp.gov.mz',
     'http://ecn.na',
     'http://mss.gov.na',
     'http://mti.gov.na',
     'http://ag.gov.na',
     'http://oag.gov.na',
     'http://psc.gov.na',
     'http://acc.gov.na',
     'http://mwt.gov.na',
     'http://mog.gov.na',
     'http://mirco.gov.na',
     'http://met.gov.na',
     'http://mod.gov.na',
     'http://jud.gov.na',
     'http://opm.gov.na',
     'http://op.gov.na',
     'http://mhss.gov.na',
     'http://parliament.na',
     'http://dpr.gov.ng',
     'http://icpc.gov.ng',
     'http://cac.gov.ng',
     'http://ecowas.int',
     'http://faan.gov.ng',
     'http://firs.gov.ng',
     'http://ndic.gov.ng',
     'http://nipc.gov.ng',
     'http://kanoassembly.gov.ng',
     'http://ncaa.gov.ng',
     'http://efcnigeria.org',
     'http://budgetoffice.gov.ng',
     'http://inecnigeria.org',
     'http://nafdac.gov.ng',
     'http://pencom.gov.ng',
     'http://niue.nu',
     'http://mail.gov.nu',
     'http://diwan.gov.om',
     'http://cma.gov.om',
     'http://msm.gov.om',
     'http://sai.gov.om',
     'http://na.gov.pk',
     'http://senate.gov.pk',
     'http://bankpng.gov.pg',
     'http://parliament.gov.pg',
     'http://fco.gov.uk',
     'http://cra.gov.qa',
     'http://qp.com.qa',
     'http://qfcra.com',
     'http://qcb.gov.qa',
     'http://parliament.gov.rw',
     'http://rura.gov.rw',
     'http://ag.gov.ws',
     'http://palemene.ws',
     'http://mof.gov.ws',
     'http://mwti.gov.ws',
     'http://mpmc.gov.ws',
     'http://mwcsd.gov.ws',
     'http://revenue.gov.ws',
     'http://cma.org.sa',
     'http://citc.gov.sa',
     'http://gaca.gov.sa',
     'http://mol.gov.sa',
     'http://sagia.gov.sa',
     'http://mot.gov.sa',
     'http://momra.gov.sa',
     'http://nazaha.gov.sa',
     'http://pta.gov.sa',
     'http://sama.gov.sa',
     'http://customs.gov.sa',
     'http://saudiexports.sa',
     'http://hrc.gov.sa',
     'http://mcs.gov.sa',
     'http://srca.org.sa',
     'http://sfda.gov.sa',
     'http://swa.gov.sa',
     'http://nationalassembly.sc',
     'http://parliament.gov.sl',
     'http://mofed.gov.sl',
     'http://health.gov.sl',
     'http://acra.gov.sg',
     'http://agc.gov.sg',
     'http://ago.gov.sg',
     'http://caas.gov.sg',
     'http://hsa.gov.sg',
     'http://ica.gov.sg',
     'http://iras.gov.sg',
     'http://istana.gov.sg',
     'http://mci.gov.sg',
     'http://mha.gov.sg',
     'http://mnd.gov.sg',
     'http://mewr.gov.sg',
     'http://mot.gov.sg',
     'http://mlaw.gov.sg',
     'http://mof.gov.sg',
     'http://nea.gov.sg',
     'http://pmo.gov.sg',
     'http://psd.gov.sg',
     'http://mccy.gov.sg',
     'http://ura.gov.sg',
     'http://sfa.gov.sg',
     'http://parl.gov.sg',
     'http://parliament.gov.sb',
     'http://tcsi.org.sb',
     'http://cipc.co.za',
     'http://coega.co.za',
     'http://cge.org.za',
     'http://compcom.co.za',
     'http://cogta.gov.za',
     'http://dbsa.org',
     'http://da.org.za',
     'http://dac.gov.za',
     'http://dac.gov.za',
     'http://dbe.gov.za',
     'http://fshealth.gov.za',
     'http://health.gov.za',
     'http://education.gov.za',
     'http://dha.gov.za',
     'http://dirco.gov.za',
     'http://justice.gov.za',
     'http://labour.gov.za',
     'http://dmr.gov.za',
     'http://dpme.gov.za',
     'http://drdlr.gov.za',
     'http://dst.gov.za',
     'http://dsd.gov.za',
     'http://tourism.gov.za',
     'http://thedti.gov.za',
     'http://dot.gov.za',
     'http://dwa.gov.za',
     'http://environment.gov.za',
     'http://ectreasury.gov.za',
     'http://economic.gov.za',
     'http://gcis.gov.za',
     'http://mpuleg.gov.za',
     'http://dhs.gov.za',
     'http://nlcsa.org.za',
     'http://npa.gov.za',
     'http://treasury.gov.za',
     'http://parliament.gov.za',
     'http://sars.gov.za',
     'http://sita.co.za',
     'http://dsbd.gov.za',
     'http://daff.gov.za',
     'http://dod.mil.za',
     'http://saps.gov.za',
     'http://saps.gov.za',
     'http://resbank.co.za',
     'http://presidency.gov.za',
     'http://wcpp.gov.za',
     'http://nwpl.gov.za',
     'http://leg.ncape.gov.za',
     'http://doc.gov.za',
     'http://doc.gov.za',
     'http://dtps.gov.za',
     'http://women.gov.za',
     'http://dpsa.gov.za',
     'http://dpw.gov.za',
     'http://ssa.gov.za',
     'http://dwcpd.gov.za',
     'http://fsc.co.za',
     'http://idc.co.za',
     'http://nwpg.gov.za',
     'http://agsa.co.za',
     'http://judiciary.org.za',
     'http://iom.int',
     'http://parliament.lk',
     'http://gov.kn',
     'http://niagov.com',
     'http://gov.lc',
     'http://gosl.gov.lc',
     'http://gov.vc',
     'http://svgfsa.com',
     'http://gov.sz',
     'http://sera.org.sz',
     'http://ewura.go.tz',
     'http://zura.go.tz',
     'http://ttparliament.org',
     'http://opm.gov.tt',
     'http://pm.gov.tn',
     'http://gov.tc',
     'http://tcifsc.tc',
     'http://tuvalu.tv',
     'http://adda.gov.ae',
     'http://@adfca.gov.abudhabi',
     'http://adpolice.gov.ae',
     'http://dubaided.gov.ae',
     'http://haad.ae',
     'http://dof.gov.ae',
     'http://dewa.gov.ae',
     'http://dfwac.ae',
     'http://dghr.gov.ae',
     'http://dm.gov.ae',
     'http://dubaipolice.gov.ae',
     'http://dubaitourism.ae',
     'http://dwe.gov.ae',
     'http://ecouncil.ae',
     'http://enec.gov.ae',
     'http://et.ae',
     'http://ead.ae',
     'http://eaa.gov.ae',
     'http://fanr.gov.ae',
     'http://fcsa.gov.ae',
     'http://fahr.gov.ae',
     'http://fca.gov.ae',
     'http://tax.gov.ae',
     'http://fewa.gov.ae',
     'http://fujmun.gov.ae',
     'http://gcaa.ae',
     'http://adnrd.ae',
     'http://dof.abudhabi.ae',
     'http://khda.gov.ae',
     'http://mocaf.gov.ae',
     'http://mckd.gov.ae',
     'http://economy.ae',
     'http://moe.gov.ae',
     'http://moenr.gov.ae',
     'http://mof.gov.ae',
     'http://mofa.gov.ae',
     'http://moh.gov.ae',
     'http://mohre.gov.ae',
     'http://moi.gov.ae',
     'http://mopa.gov.ae',
     'http://moid.gov.ae',
     'http://mfnca.gov.ae',
     'http://moccae.gov.ae',
     'http://moj.gov.ae',
     'http://ncema.ae',
     'http://nqa.gov.ae',
     'http://pmo.gov.ae',
     'http://rta.ae',
     'http://sca.ae',
     'http://sewa.gov.ae',
     'http://sbwc.ae',
     'http://shurooq.gov.ae',
     'http://shjmun.gov.ae',
     'http://snoc.ae',
     'http://sharjahtourism.ae',
     'http://sai.gov.ae',
     'http://tec.gov.ae',
     'http://dubaisce.gov.ae',
     'http://tra.gov.ae',
     'http://rcuae.ae',
     'http://space.gov.ae',
     'http://dmt.gov.ae',
     'http://fad.dubai.gov.ae',
     'http://dha.gov.ae',
     'http://sha.gov.ae',
     'http://nccht.gov.ae',
     'http://mod.gov.ae',
     'http://parliament.go.ug',
     'http://mofa.go.ug',
     'http://energy.go.ug',
     'http://mglsd.go.ug',
     'http://attorneygeneral.gov.uk',
     'http://cabinetoffice.gov.uk',
     'http://cma.gov.uk',
     'http://culture.gov.uk',
     'http://defra.gov.uk',
     'http://communities.gov.uk',
     'http://dfid.gov.uk',
     'http://trade.gov.uk',
     'http://fco.gov.uk',
     'http://barcouncil.org.uk',
     'http://cqc.org.uk',
     'http://hmtreasury.gov.uk',
     'http://ipreg.org.uk',
     'http://dwp.gov.uk',
     'http://niassembly.gov.uk',
     'http://nio.gov.uk',
     'http://onr.gov.uk',
     'http://ofqual.gov.uk',
     'http://ogauthority.co.uk',
     'http://orr.gov.uk',
     'http://parliament.scot',
     'http://sra.org.uk',
     'http://coal.gov.uk',
     'http://homeoffice.gov.uk',
     'http://thepensionsregulator.gov.uk',
     'http://education.gov.uk',
     'http://ukexportfinance.gov.uk',
     'http://mod.gov.uk',
     'http://dft.gov.uk',
     'http://justice.gov.uk',
     'http://clc-uk@org',
     'http://sfo.gov.uk',
     'http://gov.vu',
     'http://vfsc.vu',
     'http://parliament.gov.zm',
     'http://psmd.gov.zm',
     'http://zimra.co.zw',
     'http://potraz.gov.zw',*/
];

let i = 0;

scraper.on('finished', () => {
    i++;
    if(i < urls.length)
    {
        scraper.crawl(urls[i]);
    }
    else
    {
        scraper.save('./output.csv');
    }
});

scraper.crawl(urls[i]);
