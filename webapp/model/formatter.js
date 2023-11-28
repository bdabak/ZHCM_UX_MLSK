sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		formatWeighting: function (v, d = 2, u = true) {
			if(!parseFloat(v) >= 1){
			  return null;
			}
			var oFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
			  groupingEnabled: false, // grouping is enabled
			  decimalSeparator: ",", // the decimal separator must be different from the grouping separator
			  decimals: d
			});
	  
			var f = oFormat.format(parseFloat(v));
	  
			if(u){
			  f = " (" + f +  "%)";
			}
	  
			return f;
		  },

	};

});