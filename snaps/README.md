# Airline Snap

This is a snap for airline.

## Change shasum

Use yarn mm-snap manifest --fix to update the shasum in your Snap manifest file `yarn mm-snap manifest --fix`

## Develop

Run `yarn install` to install the dependencies.

Run `yarn start` to run sanp.

The snap will be run in `local:http://localhost:8080`.

## Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and
fix any automatically fixable issues.
