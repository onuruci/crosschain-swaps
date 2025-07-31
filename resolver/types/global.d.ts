declare global { 
    type DeployScriptResult = {
        txid: string,
        vout: number,
        address: string,
        lockerPubKey: string,
        hash: string
    }
}

export {
    DeployScriptResult
}; 