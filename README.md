
### Download chromium
> npx playwright install chromium
    
You can install other browsers and run them too. 
I have not yet integrated options other than `Chromium`

## Required Arguments

### --filein 
    - Absolute path to url list
### --fileout 
    - Absolute path to the output file that will be created
### --client 
    - Name of client
### --domain 
    - Name of domain

## Optional Arguments

### --debug or -x | accepts following values
    - input
    - output

## Example
```
node index.js 
--filein ~/path/to/urls.csv 
--fileout ~/path/to/output.csv 
--client="<client>" 
--domain="<domain>" 
--debug input
```
