import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { BLUSDToken, BLUSDTokenInterface } from "../BLUSDToken";
declare type BLUSDTokenConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class BLUSDToken__factory extends ContractFactory {
    constructor(...args: BLUSDTokenConstructorParams);
    deploy(name_: string, symbol_: string, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<BLUSDToken>;
    getDeployTransaction(name_: string, symbol_: string, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): TransactionRequest;
    attach(address: string): BLUSDToken;
    connect(signer: Signer): BLUSDToken__factory;
    static readonly bytecode = "0x60806040523480156200001157600080fd5b506040516200111038038062001110833981016040819052620000349162000251565b8151829082906200004d906003906020850190620000de565b50805162000063906004906020840190620000de565b505050620000806200007a6200008860201b60201c565b6200008c565b5050620002f8565b3390565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b828054620000ec90620002bb565b90600052602060002090601f0160209004810192826200011057600085556200015b565b82601f106200012b57805160ff19168380011785556200015b565b828001600101855582156200015b579182015b828111156200015b5782518255916020019190600101906200013e565b50620001699291506200016d565b5090565b5b808211156200016957600081556001016200016e565b634e487b7160e01b600052604160045260246000fd5b600082601f830112620001ac57600080fd5b81516001600160401b0380821115620001c957620001c962000184565b604051601f8301601f19908116603f01168101908282118183101715620001f457620001f462000184565b816040528381526020925086838588010111156200021157600080fd5b600091505b8382101562000235578582018301518183018401529082019062000216565b83821115620002475760008385830101525b9695505050505050565b600080604083850312156200026557600080fd5b82516001600160401b03808211156200027d57600080fd5b6200028b868387016200019a565b93506020850151915080821115620002a257600080fd5b50620002b1858286016200019a565b9150509250929050565b600181811c90821680620002d057607f821691505b60208210811415620002f257634e487b7160e01b600052602260045260246000fd5b50919050565b610e0880620003086000396000f3fe608060405234801561001057600080fd5b50600436106101165760003560e01c806381d3c435116100a2578063a457c2d711610071578063a457c2d71461023c578063a9059cbb1461024f578063c6315aa014610262578063dd62ed3e14610275578063f2fde38b1461028857600080fd5b806381d3c435146101e95780638da5cb5b146101fc57806395d89b41146102215780639dc29fac1461022957600080fd5b8063313ce567116100e9578063313ce56714610181578063395093511461019057806340c10f19146101a357806370a08231146101b8578063715018a6146101e157600080fd5b806306fdde031461011b578063095ea7b31461013957806318160ddd1461015c57806323b872dd1461016e575b600080fd5b61012361029b565b6040516101309190610bf1565b60405180910390f35b61014c610147366004610c62565b61032d565b6040519015158152602001610130565b6002545b604051908152602001610130565b61014c61017c366004610c8c565b610345565b60405160128152602001610130565b61014c61019e366004610c62565b610369565b6101b66101b1366004610c62565b61038b565b005b6101606101c6366004610cc8565b6001600160a01b031660009081526020819052604090205490565b6101b66103a1565b6101b66101f7366004610cc8565b6103e0565b6005546001600160a01b03165b6040516001600160a01b039091168152602001610130565b610123610430565b6101b6610237366004610c62565b61043f565b61014c61024a366004610c62565b610451565b61014c61025d366004610c62565b6104cc565b600654610209906001600160a01b031681565b610160610283366004610cea565b6104da565b6101b6610296366004610cc8565b610505565b6060600380546102aa90610d1d565b80601f01602080910402602001604051908101604052809291908181526020018280546102d690610d1d565b80156103235780601f106102f857610100808354040283529160200191610323565b820191906000526020600020905b81548152906001019060200180831161030657829003601f168201915b5050505050905090565b60003361033b81858561059d565b5060019392505050565b6000336103538582856106c2565b61035e85858561073c565b506001949350505050565b60003361033b81858561037c83836104da565b6103869190610d6e565b61059d565b61039361090a565b61039d828261097a565b5050565b6005546001600160a01b031633146103d45760405162461bcd60e51b81526004016103cb90610d86565b60405180910390fd5b6103de6000610a59565b565b6005546001600160a01b0316331461040a5760405162461bcd60e51b81526004016103cb90610d86565b600680546001600160a01b0319166001600160a01b03831617905561042d6103a1565b50565b6060600480546102aa90610d1d565b61044761090a565b61039d8282610aab565b6000338161045f82866104da565b9050838110156104bf5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084016103cb565b61035e828686840361059d565b60003361033b81858561073c565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6005546001600160a01b0316331461052f5760405162461bcd60e51b81526004016103cb90610d86565b6001600160a01b0381166105945760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084016103cb565b61042d81610a59565b6001600160a01b0383166105ff5760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b60648201526084016103cb565b6001600160a01b0382166106605760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b60648201526084016103cb565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b60006106ce84846104da565b9050600019811461073657818110156107295760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e636500000060448201526064016103cb565b610736848484840361059d565b50505050565b6001600160a01b0383166107a05760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b60648201526084016103cb565b6001600160a01b0382166108025760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b60648201526084016103cb565b6001600160a01b0383166000908152602081905260409020548181101561087a5760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b60648201526084016103cb565b6001600160a01b038085166000908152602081905260408082208585039055918516815290812080548492906108b1908490610d6e565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516108fd91815260200190565b60405180910390a3610736565b6006546001600160a01b031633146103de5760405162461bcd60e51b815260206004820152602d60248201527f424c555344546f6b656e3a2043616c6c6572206d75737420626520436869636b60448201526c32b72137b73226b0b730b3b2b960991b60648201526084016103cb565b6001600160a01b0382166109d05760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064016103cb565b80600260008282546109e29190610d6e565b90915550506001600160a01b03821660009081526020819052604081208054839290610a0f908490610d6e565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b038216610b0b5760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b60648201526084016103cb565b6001600160a01b03821660009081526020819052604090205481811015610b7f5760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b60648201526084016103cb565b6001600160a01b0383166000908152602081905260408120838303905560028054849290610bae908490610dbb565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef906020016106b5565b600060208083528351808285015260005b81811015610c1e57858101830151858201604001528201610c02565b81811115610c30576000604083870101525b50601f01601f1916929092016040019392505050565b80356001600160a01b0381168114610c5d57600080fd5b919050565b60008060408385031215610c7557600080fd5b610c7e83610c46565b946020939093013593505050565b600080600060608486031215610ca157600080fd5b610caa84610c46565b9250610cb860208501610c46565b9150604084013590509250925092565b600060208284031215610cda57600080fd5b610ce382610c46565b9392505050565b60008060408385031215610cfd57600080fd5b610d0683610c46565b9150610d1460208401610c46565b90509250929050565b600181811c90821680610d3157607f821691505b60208210811415610d5257634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b60008219821115610d8157610d81610d58565b500190565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b600082821015610dcd57610dcd610d58565b50039056fea264697066735822122031bf515a15096b63c28fa95cba0c359307d4491da1a1dc74e55c195710ecaffc64736f6c634300080a0033";
    static readonly abi: ({
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
        name?: undefined;
        outputs?: undefined;
    } | {
        anonymous: boolean;
        inputs: {
            indexed: boolean;
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: string;
        stateMutability?: undefined;
        outputs?: undefined;
    } | {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    })[];
    static createInterface(): BLUSDTokenInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): BLUSDToken;
}
export {};
