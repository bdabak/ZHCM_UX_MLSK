sap.ui.define([
	"hcm/ux/mlsk/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("hcm.ux.mlsk.controller.App", {

		onInit: function () {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function () {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};
			
			//--Add custom icon fonts
			sap.ui.core.IconPool.addIcon("circle_0", "customfont", "smodfont", "e900");
	        sap.ui.core.IconPool.addIcon("circle_90", "customfont", "smodfont", "e901");
	        sap.ui.core.IconPool.addIcon("circle_180", "customfont", "smodfont", "e902");
	        sap.ui.core.IconPool.addIcon("circle_270", "customfont", "smodfont", "e903");
	        sap.ui.core.IconPool.addIcon("circle_360", "customfont", "smodfont", "e904");

			// disable busy indication when the metadata is loaded and in case of errors
			this.getOwnerComponent().getModel().metadataLoaded().
			then(fnSetAppNotBusy);
			this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
		}
	});

});