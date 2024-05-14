const BN = require('bn.js')

const _1e36Str = "1000000000000000000000000000000000000"

class  Allocator{
    static async allocate(contracts, accounts) {
        // console.log(contracts.borrowerWrappers)
        

        for (let account of accounts) {
            contracts.stETH.mint(account, web3.utils.toBN(_1e36Str))
            contracts.stETH.hackApprove(account, contracts.borrowerOperations.address, web3.utils.toBN(_1e36Str))

            if (contracts.borrowerWrappers) {
                for (let c in contracts.borrowerWrappers.proxies) {
                    let a = contracts.borrowerWrappers.proxies[c].address
                    contracts.stETH.hackApprove(account, a, web3.utils.toBN(_1e36Str))
                }
            }
        }

    }
}

module.exports = {
    Allocator
}