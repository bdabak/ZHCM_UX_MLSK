sap.ui.define([
	"hcm/ux/mlsk/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("hcm.ux.mlsk.controller.NotFound", {

		/**
		 * Navigates to the worklist when the link is pressed
		 * @public
		 */
		onLinkPressed: function () {
			this.getRouter().navTo("multipleSkill");
		}

	});

});