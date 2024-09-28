package volatile_storage

import (
	"math/big"
	"testing"

	"github.com/brevis-network/brevis-sdk/sdk"
	"github.com/brevis-network/brevis-sdk/test"
	"github.com/ethereum/go-ethereum/common"
)

// In this example, we want to analyze the `Swap` events emitted by Uniswap's
// UniversalRouter contract. Let's declare the fields we want to use:

func TestCircuit(t *testing.T) {
	app, err := sdk.NewBrevisApp()
	check(err)

	usdcWETHPool := common.HexToAddress("0x1ac1a8feaaea1900c4166deeed0c11cc10669d36")

	app.AddStorage(sdk.StorageData{
		BlockNum: big.NewInt(20819971),
		Address:  usdcWETHPool,
		Slot:     common.HexToHash("0x0"),
		Value:    common.HexToHash("0x000000000b000b00050303860000000000004bef5fe64646a49796daf4d1b195"),
	})

	app.AddStorage(sdk.StorageData{
		BlockNum: big.NewInt(20819961),
		Address:  usdcWETHPool,
		Slot:     common.HexToHash("0x0"),
		Value:    common.HexToHash("0x000000000b000b000403038a0000000000004bf24e39dba40ea66033b77cd38e"),
	})

	app.AddStorage(sdk.StorageData{
		BlockNum: big.NewInt(20819921),
		Address:  usdcWETHPool,
		Slot:     common.HexToHash("0x0"),
		Value:    common.HexToHash("0x000000000b000b00030303720000000000004bdbaa4082be177c0b9793467380"),
	})

	app.AddStorage(sdk.StorageData{
		BlockNum: big.NewInt(20819881),
		Address:  usdcWETHPool,
		Slot:     common.HexToHash("0x0"),
		Value:    common.HexToHash("0x000000000b000b000203037e0000000000004be6c8e9fbaa7b3c9e12db633744"),
	})

	app.AddStorage(sdk.StorageData{
		BlockNum: big.NewInt(20819631),
		Address:  usdcWETHPool,
		Slot:     common.HexToHash("0x0"),
		Value:    common.HexToHash("0x000000000b000b00010303750000000000004bde32d8a9e17842418250c566d7"),
	})
	// Initialize our AppCircuit and prepare the circuit assignment
	appCircuit := &AppCircuit{}
	appCircuitAssignment := &AppCircuit{}

	// Execute the added queries and package the query results into circuit inputs
	in, err := app.BuildCircuitInput(appCircuit)
	check(err)

	///////////////////////////////////////////////////////////////////////////////
	// Testing
	///////////////////////////////////////////////////////////////////////////////

	// Use the test package to check if the circuit can be solved using the given
	// assignment
	test.ProverSucceeded(t, appCircuit, appCircuitAssignment, in)
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
