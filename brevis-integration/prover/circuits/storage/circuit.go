package volatile_storage

import (
	"fmt"

	"github.com/brevis-network/brevis-sdk/sdk"
)

type AppCircuit struct{}

// Limited 100 storage slots.
func (c *AppCircuit) Allocate() (maxReceipts, maxStorage, maxTransactions int) {
	return 0, 50, 0
}

func (c *AppCircuit) Define(api *sdk.CircuitAPI, in sdk.DataInput) error {
	uint248 := api.Uint248
	storageSlots := sdk.NewDataStream(api, in.StorageSlots)

	// get a list of sqrtPriceX96 values.
	pricePoints := sdk.Map(storageSlots, func(slot sdk.StorageSlot) sdk.Uint248 {
		// slot.value is a bytes32 value
		binary := api.Bytes32.ToBinary(slot.Value)

		// sqrPriceX96 variable is uint160.
		// Exclude bit mask, get first bits from 0 to 159 of the storage value.
		sqrtPricePart := binary[0:159]

		// Explain:
		// sqrtPriceX96 = sqrt(token0_price / token1_price) * 2**96
		// token0_price = token0_decimal_value * 10**token0_decimals
		// token1_price = token1_decimal_value * 10**token1_decimals
		restoredSqrtPriceX96 := api.Uint248.FromBinary(sqrtPricePart...)

		return restoredSqrtPriceX96
	})

	// If the number of storage items is zero then Division by Zero error can happen later.
	count := len(in.StorageSlots.Toggles)
	fmt.Println("Count:", count)

	// Start to calculate Mean and Standard deviation.

	// Use this fomular: sigma = sqrt( sum( (pricePoints[i] - mean)**2 ) / count)
	// Calculate mean
	mean := sdk.Mean(pricePoints)

	// Calculate an array of (pricePoints[i] - mean)**2
	squareOfPriceSubMean := sdk.Map(pricePoints, func(price sdk.Uint248) sdk.Uint248 {
		sub := absUint248Sub(api, price, mean)
		return uint248.Mul(sub, sub)
	})

	// Calculate sum of square
	sum := sdk.Sum(squareOfPriceSubMean)
	fmt.Println("Sum of square:", sum)

	// Calculate sigma**2
	squareSigma, _ := uint248.Div(sum, sdk.ConstUint248(count))

	sigma := uint248.Sqrt(squareSigma)

	// Mean
	// Test mean: 79228162514264337593543950336
	fmt.Println("Mean:", mean)
	api.OutputUint(248, mean)

	// Sigma
	// Test sigma: 11602696000000000687916187648
	fmt.Println("Sigma:", sigma)
	api.OutputUint(248, sigma)

	return nil
}

// Convert from int to bool
func intToBool(val sdk.Uint248) bool {
	var stringValue = val.String()
	if stringValue == "0" {
		return false
	} else {
		return true
	}

}

// Absolute value of a Sub operation.
func absUint248Sub(api *sdk.CircuitAPI, a, b sdk.Uint248) sdk.Uint248 {
	uint248 := api.Uint248

	aLessThanB := uint248.IsLessThan(a, b)
	cond := intToBool(aLessThanB)

	if cond {
		return uint248.Sub(b, a)
	}
	return uint248.Sub(a, b)
}
