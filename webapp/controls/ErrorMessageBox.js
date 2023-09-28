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
	var E = Control.extend("hcm.ux.mlsk.controls.ErrorMessageBox", {

		metadata: {
			properties: {

			},
			aggregations: {
				errorList: {
					type: "hcm.ux.mlsk.controls.ErrorList",
					multiple: true,
					singularName: "errorList"
				}

			}

		},
		renderer: function (oRM, oControl) {

			var aErorList = oControl.getAggregation("errorList");

			try {
				if (!aErorList || aErorList.length < 1) {
					jQuery.sap.log.error("No column specified. Render error!");
					return;
				}
			} catch (ex) {
				jQuery.sap.log.error("No column specified. Render error!");
				return;
			}
			var sCol = aErorList.length;

			oRM.write("<div");
			oRM.writeControlData(oControl);
			oRM.addClass("sapUiTinyMargin");
			oRM.writeClasses();
			oRM.write(">");
			oRM.write("<ul>");

			$.each(aErorList, function (sKey, oError) {
				oRM.renderControl(oError);
			});
			oRM.write("</ul>");
			oRM.write("</div>"); //Wrapper

		}

	});

	return E;

});