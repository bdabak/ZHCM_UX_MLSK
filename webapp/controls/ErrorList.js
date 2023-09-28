/*global window*/
/*global navigator*/
/*global moment*/
/*global _*/
sap.ui.define([
	"sap/ui/core/Control",
	"sap/m/MessageToast",
	"sap/m/MessageBox",

], function (Control, MessageToast, MessageBox) {
	"use strict";
	var B = Control.extend("hcm.ux.mlsk.controls.ErrorList", {

		metadata: {
			properties: {
				id: {
					type: "string",
					bindable: true
				},
				text: {
					type: "string",
					bindable: true,

				}
			},
			aggregations: {}

		},

		renderer: function (oRM, oControl) {

			oRM.write("<li");
			//oRM.addClass("sapUiTinyMargin");
			oRM.writeControlData(oControl);
			oRM.write(">");
			oRM.write(oControl.getText());
			oRM.write("</li");
			oRM.write(">");

		},

	});
	return B;
});