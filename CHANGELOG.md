# Change Log

## [0.0.1] - April 30, 2018

### Added

Initial release

## [0.1.0] - January 20, 2020

### Added

-   Test coverage
-   Pass date type for dates

### Changed

-   Update dependencies
-   Update docs

## [0.1.2] - February 13, 2020

### Fixed

-   Issue with Date parameter

## [0.2.0] - March 03, 2020

### Added

-   Use sql.queryValue to query for the value of the first key of the first record

## [0.3.0] - June 29, 2020

### Changed

-   sql.init returns a promise which rejects with error if connection to DB fails

### Added

-   Introduced a new "functions" concept for helper functions with non-standard sql commands
-   new function to insert an object in database. The keys of the object should be the same as the db table. sql.function.insertObject(TableName: string, Obj: {[key: string]: any})

## [0.4.0] - July 02, 2020

### Added

-   Added new function `sql.function.bulkInsert` for inserting data in a table in bulk

## [0.5.0] - October 24, 2021

### Added

-   Added new function `sql.function.mergeTables` for merging 2 DB tables
-   Added new function `sql.function.mergeValues` for merging a data object into a DB table
