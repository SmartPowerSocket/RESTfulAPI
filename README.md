# RESTfulAPI

## Reference
This project was done as part of an undergrad thesis, for more details visit: https://docs.google.com/file/d/0B4CqM12akwGJQ2hrTlVPTWtFYkE/edit?filetype=msword

## Getting Started

Install MongoDB before running the API server:
https://docs.mongodb.org/manual/installation/

After installing it, remember to run mongo by doing:
```sh
$ mongod
```

Install dependencies and start app
```sh
$ npm install
$ touch .env
$ echo "PARTICLE_USER_EMAIL='${PARTICLE_USER_EMAIL}'" > .env
$ echo "PARTICLE_USER_PASSWORD='${PARTICLE_USER_PASSWORD}'" > .env
$ npm run dev
```
