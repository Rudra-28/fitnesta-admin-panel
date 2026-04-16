#!/bin/bash
npm run build && scp -r dist/* root@82.29.164.24:/home/rivoratech-fitnestadmin/htdocs/fitnestadmin.rivoratech.com/fitnesta-admin-panel/dist/
