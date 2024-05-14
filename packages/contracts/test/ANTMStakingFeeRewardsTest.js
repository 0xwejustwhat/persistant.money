const Decimal = require("decimal.js");
const deploymentHelper = require("../utils/deploymentHelpers.js")
const { BNConverter } = require("../utils/BNConverter.js")
const testHelpers = require("../utils/testHelpers.js")
const stETHAllocator = require("../utils/AllocateSTETH.js")

const ANTMStakingTester = artifacts.require('ANTMStakingTester')
const TroveManagerTester = artifacts.require("TroveManagerTester")
const NonPayable = artifacts.require("./NonPayable.sol")

const th = testHelpers.TestHelper
const allocator = stETHAllocator.Allocator
const timeValues = testHelpers.TimeValues
const dec = th.dec
const assertRevert = th.assertRevert

const toBN = th.toBN
const ZERO = th.toBN('0')

const GAS_PRICE = 10000000

/* NOTE: These tests do not test for specific ETH and ANTUSD gain values. They only test that the 
 * gains are non-zero, occur when they should, and are in correct proportion to the user's stake. 
 *
 * Specific ETH/ANTUSD gain values will depend on the final fee schedule used, and the final choices for
 * parameters BETA and MINUTE_DECAY_FACTOR in the TroveManager, which are still TBD based on economic
 * modelling.
 * 
 */ 

contract('ANTMStaking revenue share tests', async accounts => {

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)
  
  const [owner, A, B, C, D, E, F, G, whale] = accounts;

  let priceFeed
  let antusdToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let borrowerOperations
  let antmStaking
  let antmToken

  let contracts

  const openTrove = async (params) => th.openTrove(contracts, params)

  beforeEach(async () => {
    contracts = await deploymentHelper.deployLiquityCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts = await deploymentHelper.deployANTUSDTokenTester(contracts)
    const ANTMContracts = await deploymentHelper.deployANTMTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)
    
    await deploymentHelper.connectANTMContracts(ANTMContracts)
    await deploymentHelper.connectCoreContracts(contracts, ANTMContracts)
    await deploymentHelper.connectANTMContractsToCore(ANTMContracts, contracts)

    await allocator.allocate(contracts, accounts.slice(0, 10))

    nonPayable = await NonPayable.new() 
    priceFeed = contracts.priceFeedTestnet
    antusdToken = contracts.antusdToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers

    antmToken = ANTMContracts.antmToken
    antmStaking = ANTMContracts.antmStaking
  })

  it('stake(): reverts if amount is zero', async () => {
    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // console.log(`A antm bal: ${await antmToken.balanceOf(A)}`)

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await assertRevert(antmStaking.stake(0, {from: A}), "ANTMStaking: Amount must be non-zero")
  })

  it("ETH fee per ANTM staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig, gasPrice: GAS_PRICE})

    // console.log(`A antm bal: ${await antmToken.balanceOf(A)}`)

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(100, 18), {from: A})

    // Check ETH fee per unit staked is zero
    const F_ETH_Before = await antmStaking.F_ETH()
    assert.equal(F_ETH_Before, '0')

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee emitted in event is non-zero
    const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3])
    assert.isTrue(emittedETHFee.gt(toBN('0')))

    // Check ETH fee per unit staked has increased by correct amount
    const F_ETH_After = await antmStaking.F_ETH()

    // Expect fee per unit staked = fee/100, since there is 100 ANTUSD totalStaked
    const expected_F_ETH_After = emittedETHFee.div(toBN('100')) 

    assert.isTrue(expected_F_ETH_After.eq(F_ETH_After))
  })

  it("ETH fee per ANTM staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig, gasPrice: GAS_PRICE})

    // Check ETH fee per unit staked is zero
    const F_ETH_Before = await antmStaking.F_ETH()
    assert.equal(F_ETH_Before, '0')

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee emitted in event is non-zero
    const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3])
    assert.isTrue(emittedETHFee.gt(toBN('0')))

    // Check ETH fee per unit staked has not increased 
    const F_ETH_After = await antmStaking.F_ETH()
    assert.equal(F_ETH_After, '0')
  })

  it("ANTUSD fee per ANTM staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(100, 18), {from: A})

    // Check ANTUSD fee per unit staked is zero
    const F_ANTUSD_Before = await antmStaking.F_ETH()
    assert.equal(F_ANTUSD_Before, '0')

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice= GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // Check base rate is now non-zero
    const baseRate = await troveManager.baseRate()
    assert.isTrue(baseRate.gt(toBN('0')))

    // D draws debt
    const tx = await borrowerOperations.withdrawANTUSD(th._100pct, dec(27, 18), D, D, {from: D})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(tx))
    assert.isTrue(emittedANTUSDFee.gt(toBN('0')))
    
    // Check ANTUSD fee per unit staked has increased by correct amount
    const F_ANTUSD_After = await antmStaking.F_ANTUSD()

    // Expect fee per unit staked = fee/100, since there is 100 ANTUSD totalStaked
    const expected_F_ANTUSD_After = emittedANTUSDFee.div(toBN('100')) 

    assert.isTrue(expected_F_ANTUSD_After.eq(F_ANTUSD_After))
  })

  it("ANTUSD fee per ANTM staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // Check ANTUSD fee per unit staked is zero
    const F_ANTUSD_Before = await antmStaking.F_ETH()
    assert.equal(F_ANTUSD_Before, '0')

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // Check base rate is now non-zero
    const baseRate = await troveManager.baseRate()
    assert.isTrue(baseRate.gt(toBN('0')))

    // D draws debt
    const tx = await borrowerOperations.withdrawANTUSD(th._100pct, dec(27, 18), D, D, {from: D})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(tx))
    assert.isTrue(emittedANTUSDFee.gt(toBN('0')))
    
    // Check ANTUSD fee per unit staked did not increase, is still zero
    const F_ANTUSD_After = await antmStaking.F_ANTUSD()
    assert.equal(F_ANTUSD_After, '0')
  })

  it("ANTM Staking: A single staker earns all ETH and ANTM fees that occur", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(100, 18), {from: A})

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await antusdToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await antusdToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_1 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedANTUSDFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_2 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedANTUSDFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)
    const expectedTotalANTUSDGain = emittedANTUSDFee_1.add(emittedANTUSDFee_2)

    const A_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(A))

    // A un-stakes
    const GAS_Used = th.gasUsed(await antmStaking.unstake(dec(100, 18), {from: A, gasPrice: GAS_PRICE }))

    const A_ETHBalance_After = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(A))


    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before) // .add(toBN(GAS_Used * GAS_PRICE))
    const A_ANTUSDGain = A_ANTUSDBalance_After.sub(A_ANTUSDBalance_Before)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedTotalANTUSDGain, A_ANTUSDGain), 1000)
  })

  it("stake(): Top-up sends out all accumulated ETH and ANTUSD gains to the staker", async () => { 
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await antusdToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await antusdToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_1 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedANTUSDFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_2 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedANTUSDFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)
    const expectedTotalANTUSDGain = emittedANTUSDFee_1.add(emittedANTUSDFee_2)

    const A_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(A))

    // A tops up
    const GAS_Used = th.gasUsed(await antmStaking.stake(dec(50, 18), {from: A, gasPrice: GAS_PRICE }))

    const A_ETHBalance_After = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(A))

    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before) // .add(toBN(GAS_Used * GAS_PRICE))
    const A_ANTUSDGain = A_ANTUSDBalance_After.sub(A_ANTUSDBalance_Before)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedTotalANTUSDGain, A_ANTUSDGain), 1000)
  })

  it("getPendingETHGain(): Returns the staker's correct pending ETH gain", async () => { 
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await antusdToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await antusdToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)

    const A_ETHGain = await antmStaking.getPendingETHGain(A)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
  })

  it("getPendingANTUSDGain(): Returns the staker's correct pending ANTUSD gain", async () => { 
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A
    await antmToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await antusdToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await antusdToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await antusdToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await antusdToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_1 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedANTUSDFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check ANTUSD fee value in event is non-zero
    const emittedANTUSDFee_2 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedANTUSDFee_2.gt(toBN('0')))

    const expectedTotalANTUSDGain = emittedANTUSDFee_1.add(emittedANTUSDFee_2)
    const A_ANTUSDGain = await antmStaking.getPendingANTUSDGain(A)

    assert.isAtMost(th.getDifference(expectedTotalANTUSDGain, A_ANTUSDGain), 1000)
  })

  // - multi depositors, several rewards
  it("ANTM Staking: Multiple stakers earn the correct share of all ETH and ANTM fees, based on their stake size", async () => {
    await openTrove({ extraANTUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })
    await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: E } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: F } })
    await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: G } })

    // FF time one year so owner can transfer ANTM
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers ANTM to staker A, B, C
    await antmToken.transfer(A, dec(100, 18), {from: multisig})
    await antmToken.transfer(B, dec(200, 18), {from: multisig})
    await antmToken.transfer(C, dec(300, 18), {from: multisig})

    // A, B, C make stake
    await antmToken.approve(antmStaking.address, dec(100, 18), {from: A})
    await antmToken.approve(antmStaking.address, dec(200, 18), {from: B})
    await antmToken.approve(antmStaking.address, dec(300, 18), {from: C})
    await antmStaking.stake(dec(100, 18), {from: A})
    await antmStaking.stake(dec(200, 18), {from: B})
    await antmStaking.stake(dec(300, 18), {from: C})

    // Confirm staking contract holds 600 ANTM
    // console.log(`antm staking ANTM bal: ${await antmToken.balanceOf(antmStaking.address)}`)
    assert.equal(await antmToken.balanceOf(antmStaking.address), dec(600, 18))
    assert.equal(await antmStaking.totalANTMStaked(), dec(600, 18))

    // F redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(F, contracts, dec(45, 18), gasPrice = GAS_PRICE)
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

     // G redeems
     const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(G, contracts, dec(197, 18), gasPrice = GAS_PRICE)
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // F draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(104, 18), F, F, {from: F})
    const emittedANTUSDFee_1 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedANTUSDFee_1.gt(toBN('0')))

    // G draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(17, 18), G, G, {from: G})
    const emittedANTUSDFee_2 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedANTUSDFee_2.gt(toBN('0')))

    // D obtains ANTM from owner and makes a stake
    await antmToken.transfer(D, dec(50, 18), {from: multisig})
    await antmToken.approve(antmStaking.address, dec(50, 18), {from: D})
    await antmStaking.stake(dec(50, 18), {from: D})

    // Confirm staking contract holds 650 ANTM
    assert.equal(await antmToken.balanceOf(antmStaking.address), dec(650, 18))
    assert.equal(await antmStaking.totalANTMStaked(), dec(650, 18))

     // G redeems
     const redemptionTx_3 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(197, 18), gasPrice = GAS_PRICE)
     const emittedETHFee_3 = toBN((await th.getEmittedRedemptionValues(redemptionTx_3))[3])
     assert.isTrue(emittedETHFee_3.gt(toBN('0')))

     // G draws debt
    const borrowingTx_3 = await borrowerOperations.withdrawANTUSD(th._100pct, dec(17, 18), G, G, {from: G})
    const emittedANTUSDFee_3 = toBN(th.getANTUSDFeeFromANTUSDBorrowingEvent(borrowingTx_3))
    assert.isTrue(emittedANTUSDFee_3.gt(toBN('0')))
     
    /*  
    Expected rewards:

    A_ETH: (100* ETHFee_1)/600 + (100* ETHFee_2)/600 + (100*ETH_Fee_3)/650
    B_ETH: (200* ETHFee_1)/600 + (200* ETHFee_2)/600 + (200*ETH_Fee_3)/650
    C_ETH: (300* ETHFee_1)/600 + (300* ETHFee_2)/600 + (300*ETH_Fee_3)/650
    D_ETH:                                             (100*ETH_Fee_3)/650

    A_ANTUSD: (100*ANTUSDFee_1 )/600 + (100* ANTUSDFee_2)/600 + (100*ANTUSDFee_3)/650
    B_ANTUSD: (200* ANTUSDFee_1)/600 + (200* ANTUSDFee_2)/600 + (200*ANTUSDFee_3)/650
    C_ANTUSD: (300* ANTUSDFee_1)/600 + (300* ANTUSDFee_2)/600 + (300*ANTUSDFee_3)/650
    D_ANTUSD:                                               (100*ANTUSDFee_3)/650
    */

    // Expected ETH gains
    const expectedETHGain_A = toBN('100').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('100').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('100').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_B = toBN('200').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('200').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('200').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_C = toBN('300').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('300').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('300').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_D = toBN('50').mul(emittedETHFee_3).div( toBN('650'))

    // Expected ANTUSD gains:
    const expectedANTUSDGain_A = toBN('100').mul(emittedANTUSDFee_1).div( toBN('600'))
                            .add(toBN('100').mul(emittedANTUSDFee_2).div( toBN('600')))
                            .add(toBN('100').mul(emittedANTUSDFee_3).div( toBN('650')))

    const expectedANTUSDGain_B = toBN('200').mul(emittedANTUSDFee_1).div( toBN('600'))
                            .add(toBN('200').mul(emittedANTUSDFee_2).div( toBN('600')))
                            .add(toBN('200').mul(emittedANTUSDFee_3).div( toBN('650')))

    const expectedANTUSDGain_C = toBN('300').mul(emittedANTUSDFee_1).div( toBN('600'))
                            .add(toBN('300').mul(emittedANTUSDFee_2).div( toBN('600')))
                            .add(toBN('300').mul(emittedANTUSDFee_3).div( toBN('650')))
    
    const expectedANTUSDGain_D = toBN('50').mul(emittedANTUSDFee_3).div( toBN('650'))


    const A_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(A))
    const B_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(B))
    const B_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(B))
    const C_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(C))
    const C_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(C))
    const D_ETHBalance_Before = toBN(await contracts.stETH.balanceOf(D))
    const D_ANTUSDBalance_Before = toBN(await antusdToken.balanceOf(D))

    // A-D un-stake
    const A_GAS_Used = th.gasUsed(await antmStaking.unstake(dec(100, 18), {from: A, gasPrice: GAS_PRICE }))
    const B_GAS_Used = th.gasUsed(await antmStaking.unstake(dec(200, 18), {from: B, gasPrice: GAS_PRICE }))
    const C_GAS_Used = th.gasUsed(await antmStaking.unstake(dec(400, 18), {from: C, gasPrice: GAS_PRICE }))
    const D_GAS_Used = th.gasUsed(await antmStaking.unstake(dec(50, 18), {from: D, gasPrice: GAS_PRICE }))

    // Confirm all depositors could withdraw

    //Confirm pool Size is now 0
    assert.equal((await antmToken.balanceOf(antmStaking.address)), '0')
    assert.equal((await antmStaking.totalANTMStaked()), '0')

    // Get A-D ETH and ANTUSD balances
    const A_ETHBalance_After = toBN(await contracts.stETH.balanceOf(A))
    const A_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(A))
    const B_ETHBalance_After = toBN(await contracts.stETH.balanceOf(B))
    const B_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(B))
    const C_ETHBalance_After = toBN(await contracts.stETH.balanceOf(C))
    const C_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(C))
    const D_ETHBalance_After = toBN(await contracts.stETH.balanceOf(D))
    const D_ANTUSDBalance_After = toBN(await antusdToken.balanceOf(D))

    // Get ETH and ANTUSD gains
    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before)//.add(toBN(A_GAS_Used * GAS_PRICE))
    const A_ANTUSDGain = A_ANTUSDBalance_After.sub(A_ANTUSDBalance_Before)
    const B_ETHGain = B_ETHBalance_After.sub(B_ETHBalance_Before)//.add(toBN(B_GAS_Used * GAS_PRICE))
    const B_ANTUSDGain = B_ANTUSDBalance_After.sub(B_ANTUSDBalance_Before)
    const C_ETHGain = C_ETHBalance_After.sub(C_ETHBalance_Before)//.add(toBN(C_GAS_Used * GAS_PRICE))
    const C_ANTUSDGain = C_ANTUSDBalance_After.sub(C_ANTUSDBalance_Before)
    const D_ETHGain = D_ETHBalance_After.sub(D_ETHBalance_Before)//.add(toBN(D_GAS_Used * GAS_PRICE))
    const D_ANTUSDGain = D_ANTUSDBalance_After.sub(D_ANTUSDBalance_Before)

    // Check gains match expected amounts
    assert.isAtMost(th.getDifference(expectedETHGain_A, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedANTUSDGain_A, A_ANTUSDGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_B, B_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedANTUSDGain_B, B_ANTUSDGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_C, C_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedANTUSDGain_C, C_ANTUSDGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_D, D_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedANTUSDGain_D, D_ANTUSDGain), 1000)
  })
 
  // it("unstake(): reverts if caller has ETH gains and can't receive ETH",  async () => {
  //   await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })  
  //   await openTrove({ extraANTUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
  //   await openTrove({ extraANTUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
  //   await openTrove({ extraANTUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
  //   await openTrove({ extraANTUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

  //   await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

  //   // multisig transfers ANTM to staker A and the non-payable proxy
  //   await antmToken.transfer(A, dec(100, 18), {from: multisig})
  //   await antmToken.transfer(nonPayable.address, dec(100, 18), {from: multisig})

  //   //  A makes stake
  //   const A_stakeTx = await antmStaking.stake(dec(100, 18), {from: A})
  //   assert.isTrue(A_stakeTx.receipt.status)

  //   //  A tells proxy to make a stake
  //   const proxystakeTxData = await th.getTransactionData('stake(uint256)', ['0x56bc75e2d63100000'])  // proxy stakes 100 ANTM
  //   await nonPayable.forward(antmStaking.address, proxystakeTxData, {from: A})


  //   // B makes a redemption, creating ETH gain for proxy
  //   const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(45, 18), gasPrice = GAS_PRICE)
    
  //   const proxy_ETHGain = await antmStaking.getPendingETHGain(nonPayable.address)
  //   assert.isTrue(proxy_ETHGain.gt(toBN('0')))

  //   // Expect this tx to revert: stake() tries to send nonPayable proxy's accumulated ETH gain (albeit 0),
  //   //  A tells proxy to unstake
  //   const proxyUnStakeTxData = await th.getTransactionData('unstake(uint256)', ['0x56bc75e2d63100000'])  // proxy stakes 100 ANTM
  //   const proxyUnstakeTxPromise = nonPayable.forward(antmStaking.address, proxyUnStakeTxData, {from: A})
   
  //   // but nonPayable proxy can not accept ETH - therefore stake() reverts.
  //   await assertRevert(proxyUnstakeTxPromise)
  // })

  it("receive(): reverts when it receives ETH from an address that is not the Active Pool",  async () => { 
    const ethSendTxPromise1 = web3.eth.sendTransaction({to: antmStaking.address, from: A, value: dec(1, 'ether')})
    const ethSendTxPromise2 = web3.eth.sendTransaction({to: antmStaking.address, from: owner, value: dec(1, 'ether')})

    await assertRevert(ethSendTxPromise1)
    await assertRevert(ethSendTxPromise2)
  })

  it("unstake(): reverts if user has no stake",  async () => {  
    const unstakeTxPromise1 = antmStaking.unstake(1, {from: A})
    const unstakeTxPromise2 = antmStaking.unstake(1, {from: owner})

    await assertRevert(unstakeTxPromise1)
    await assertRevert(unstakeTxPromise2)
  })

  it('Test requireCallerIsTroveManager', async () => {
    const antmStakingTester = await ANTMStakingTester.new()
    await assertRevert(antmStakingTester.requireCallerIsTroveManager(), 'ANTMStaking: caller is not TroveM')
  })
})
