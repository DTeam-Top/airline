# Airline Snap

This is a snap for airline.

## Change shasum

Use `yarn mm-snap manifest --fix` to update the shasum in your Snap manifest file.

## Testing

The snap comes with some basic tests, to demonstrate how to write tests for
snaps. To test the snap, run `yarn test` in this directory. This will use
[`@metamask/snaps-jest`](https://github.com/MetaMask/snaps/tree/main/packages/snaps-jest)
to run the tests in `src/index.test.ts`.

## Publish

Use following to publish the snap:

`npm publish --access public --no-git-checks`
