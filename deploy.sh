#!/bin/bash
npm run build && \
ssh root@82.29.164.24 "rm -rf /home/rivoratech-fitnestadmin/htdocs/fitnestadmin.rivoratech.com/fitnesta-admin-panel/dist/*" && \
scp -r dist/* root@82.29.164.24:/home/rivoratech-fitnestadmin/htdocs/fitnestadmin.rivoratech.com/fitnesta-admin-panel/dist/
