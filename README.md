# DigixDAO
Smart contracts for DigixDAO

####  Download Dependencies
```
npm install
```

#### Testing
* Testing the `storage` layer
  ```
  truffle test test/storage/*
  ```
* Testing the `interactive` layer
  ```
  truffle migrate --network development
  FIRST_TEST=true DGD_ADDRESS=<> DGD_BADGE_ADDRESS=<> truffle test test/interactive/*
  ```
  For all subsequent tests
  ```
  DGD_ADDRESS=<> DGD_BADGE_ADDRESS=<> truffle test test/interactive/*
  ```
