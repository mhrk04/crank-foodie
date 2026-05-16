import { expect } from "chai";
import hre from "hardhat";

describe("CrankFoodie", function () {
  it("registers a restaurant and accepts reports and cleaning logs", async function () {
    const contract = await hre.viem.deployContract("CrankFoodie");

    await contract.write.registerRestaurant([
      "Kubis & Kale",
      "Bandar Sunway",
      3068500n,
      101603700n,
      2,
      "ipfs://restaurant-metadata"
    ]);

    await contract.write.submitReport([1n, 0, 4, 2, ["ipfs://evidence-a", "ipfs://evidence-b"], "ipfs://details"]);
    await contract.write.submitCleaningLog([1n, 92, "ipfs://cleaning"]);

    const restaurant = await contract.read.getRestaurant([1n]);
    const reportIds = await contract.read.getRestaurantReportIds([1n]);
    const report = await contract.read.getReport([1n]);
    const cleaningIds = await contract.read.getRestaurantCleaningLogIds([1n]);
    const score = await contract.read.calculateHygieneScore([1n]);

    expect(restaurant.name).to.equal("Kubis & Kale");
    expect(reportIds).to.deep.equal([1n]);
    expect(report.starRating).to.equal(2);
    expect(report.evidenceURIs).to.deep.equal(["ipfs://evidence-a", "ipfs://evidence-b"]);
    expect(cleaningIds).to.deep.equal([1n]);
    expect(score).to.be.lessThanOrEqual(100);
  });
});
