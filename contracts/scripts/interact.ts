// An example script that shows how to interact programmatically with a deployed contract
// You must customise it according to your contract's specifications
import hre from "hardhat";

// Colour codes for terminal prints
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";

async function main() {
  const address = "0xaaD7fa952B710B6d93837f38Bbe908D2bdc0B97A"; // Specify here your contract address
  const contract = await hre.ethers.getContractAt(
    "SlnTokenClaimingDvp",
    address,
  ); // Specify here your contract name

  ////////////////
  //  PAYLOAD  //
  //////////////

  // const newGreeting = "Buongiorno!"; // Specify here the payload of the to-be-called function

  ////////////////
  //  SENDING  //
  //////////////

  await contract.setAllowedAddress('0x851438Ecb37FAe596DcD49bDe643D170F3aa225B', true)

  // const result = await contract.isAllowedAddress('0x851438Ecb37FAe596DcD49bDe643D170F3aa225B'); // Specify here the to-be-called function name
  // console.log(result)
  // console.log("The transaction hash is: " + `${GREEN}${result}${RESET}\n`);
  // console.log("Waiting until the transaction is confirmed...\n");
  // const receipt = await tx.wait(); // Wait until the transaction is confirmed
  // console.log(
  //   "The transaction returned the following transaction receipt:\n",
  //   receipt,
  // );
}

// To run it, invoke `npx hardhat run scripts/interact.ts --network <network_name>`
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
