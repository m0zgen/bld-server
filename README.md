# BLD Server

It is an update server for BLD DNS Servers or different DNS protection / ad-blocker servers.

You can use `config.yml` which can contains many, many blocking / allowing lists for your DNS server.

## Features

* Download lists from url
* Clean lists from comments adn empty lines
* Consolidation many to one file
* Publish one file to world

## Parameters

Config structure:
```
default:
  server:
    port: 3300
    update_interval: 60
  download_dir:
    download
  public_dir:
    public
  lists:
    bl:
      - https://raw.githubusercontent.com/m0zgen/dns-hole/master/dns-blacklist.txt
    wl:
      - https://raw.githubusercontent.com/m0zgen/dns-hole/master/whitelist.txt
```

* Server port - listen port
* Server update interval - update lists in munutes
* Download dir - download catalog
* Public dir - web serve catalog
* BL lists - blocking lists
* WL lists - allowing (white) lists

## Run server

You can run once this server with needed environment for you:

```
NODE_ENV=development node index.js 
```

### Production config

You need to create catalog in `config\prod` and put `config.yml` for your production in to created `prod` catalog.

