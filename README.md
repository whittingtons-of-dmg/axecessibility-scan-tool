
### Download chromium
> npx playwright install chromium
    
You can install other browsers and run them too. 
I have not yet integrated options other than `Chromium`

### --filein 
    - Absolute path to url list
### --fileout 
    - Absolute path to the output file that will be created
### --client 
    - Name of client
### --domain 
    - Name of domain
### --debug or -x | accepts following values
    - input
    - output

### Example
```
node index.js 
--filein ~/Projects/Accessibility/sites/stark-dev-board/urls.csv 
--fileout ~/Projects/Accessibility/sites/stark-dev-board/output.csv 
--client="stark-dev-board" 
--domain="stark-dev-board.innismaggiore.org/" 
--debug input
```
