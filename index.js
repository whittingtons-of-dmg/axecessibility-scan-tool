// mission-critical packages for virtual browsers and WCAG scanning
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

// node packages for file management and cmd line args
const fs =require('fs');
const path = require('path');
const { parseArgs } = require('util');
const csvRows = ['"URL","Manual Review","Impact","Rule ID","Description","Help URL","Target Elements"'];

let count
count = 0;

// set config to accepting cmd line args
const config = {
    options: {
        filein: { type: 'string'}, // Accepts --filein
        fileout: { type: 'string'}, // Accepts --fileout
        client: { type: 'string'}, // Accepts --client
        domain: { type: 'string'}, // Accepts --domain
        debug: { type: 'string', short: 'x' }, // Accepts --debug or -x [0]
    },
};

try {
    // Parse process.argv automatically [0]
    const { values } = parseArgs(config);

    const FILE_IN  = typeof values.filein === 'string' ? values.filein : '';
    const FILE_OUT = typeof values.fileout === 'string' ? values.fileout : '';
    const CLIENT_NAME = typeof values.client === 'string' ? values.client : '';
    const DOMAIN_NAME = typeof values.domain === 'string' ? values.domain : '';
    const DEBUG = typeof values.debug === 'string' ? values.debug : false;

    if ( FILE_IN === '' ) {
        throw new Error('Required argument --filein | -i (abs path to csv) is invalid');
    }
    if ( FILE_OUT === '') {
        throw new Error('Required argument --fileout | -o (abs path to save output.csv) is invalid');
    }
    if ( CLIENT_NAME === '' ) {
        throw new Error('Required argument --client | -c (client name) is invalid');
    }
    if ( DOMAIN_NAME === '' ) {
        throw new Error('Required argument --domain | -d (project domain) is invalid');
    }

    if (!fs.existsSync(path.dirname(FILE_IN))) {
        throw new Error('The provided --filein path does not exist or is invalid');
    }

    const csvData = fs.readFileSync(FILE_IN, 'utf-8');
    const lines = csvData.split(',\n').filter(line => line.trim() !== '');
    // Split each line by commas and flatten into a single 1D array
    const flatUrlArray = lines.flatMap((line, index) => {
        if (index !== lines.length - 1)
            return line.split(',');
        else
            return line.trim().split(',');
    }).slice(1);

    if (DEBUG === 'input') {
        console.log("File In Formatted: \n", flatUrlArray)
        process.exit(1);
    }

    (async () => {
        console.log(`Starting WCAG scan for ${flatUrlArray.length} URLs...`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        for (const url of flatUrlArray) {
            count++;
            console.log(`Scanning:${count}/${flatUrlArray.length} ${url}`);
            await scanAsync(page, url)
        }

        if (!fs.existsSync(path.dirname(FILE_OUT))) {
            fs.mkdirSync(path.dirname(FILE_OUT), { recursive: true });
        }

        if (DEBUG === 'output') {
            console.log("Output: \n", csvRows)
            process.exit(1);
        }

        // 3. Write aggregated data to a local CSV file
        fs.writeFileSync(FILE_OUT, csvRows.join('\n'), 'utf8');
        console.log(`\nScan complete! Results saved locally to: ${FILE_OUT}`);

        await browser.close();
    })();

} catch (err) {
    console.error('Invalid arguments provided:', err.message);
    process.exit(1);
}

async function scanAsync(page, url) {
    try {
        await page.goto(url, {waitUntil: 'load', timeout: 30000});
        await page.waitForTimeout(2000); // let potential dynamic content load
        // Analyze against WCAG 2.0 (Levels A and AA)
        // If your goal is comprehensive WCAG 2.1 AA testing, you should also consider adding wcag21a and wcag21aa to your tags.
        const results = await new AxeBuilder({page})
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

        const violations = results.violations;
        console.log(`Found ${violations.length} type(s) of violation(s) on ${url}`);

        for (const violation of violations) {
            // Collect all DOM selectors where this issue occurs
            const targets = violation.nodes.map(node => node.target.join(' ')).join(' | ');

            // Clean data fields to prevent CSV breaking from quotes or commas
            const cleanDescription = violation.description.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');
            const cleanHelp = violation.help.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');
            const cleanTargets = targets.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');

            // Construct a standardized CSV row
            csvRows.push(`"${url}","No",${violation.impact}","${violation.id}","${cleanDescription}","${violation.helpUrl}","${cleanTargets}"`);
        }

        console.log(`${results.incomplete.length} inconclusive result(s) on ${url}`);
        for (const result of results.incomplete) {
            const targets = result.nodes.map(node => node.target.join(' ')).join(' | ');
            const cleanDescription = result.description.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');
            const cleanHelp = result.help.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');
            const cleanTargets = targets.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""');

            // Construct a standardized CSV row
            csvRows.push(`"${url}","Yes",${result.impact}","${result.id}","${cleanDescription}","${result.helpUrl}","${cleanTargets}"`);
        }

    } catch (error) {
        console.error(`Failed to scan ${url}:`, error.message);
        csvRows.push(`"${url}","No","ERROR","N/A","Failed to load or scan page: ${error.message.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/"/g, '""')}","N/A","N/A"`);
    }
}