/*global location history moment _ XLSX*/
sap.ui.define([
	"hcm/ux/mlsk/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"hcm/ux/mlsk/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"../utils/FormValidator",
	"../controls/ErrorList",
	"../controls/ErrorMessageBox",
	"sap/ui/table/Row",
	"hcm/ux/mlsk/utils/driver"
], function (BaseController,
	JSONModel,
	History,
	formatter,
	Filter,
	FilterOperator,
	MessageToast,
	MessageBox,
	FormValidator,
	ErrorList,
	ErrorMessageBox,
	Row,
	DriverJS) {
	"use strict";

	return BaseController.extend("hcm.ux.mlsk.controller.MultipleSkill", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			var oViewModel = new JSONModel();
			this.setModel(oViewModel, "multipleSkillModel");
			this._initiateModel();

			this.getRouter().getRoute("multipleSkill").attachPatternMatched(this._onMultipleSkillMatched, this);
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onYearChanged: function (oEvent) {
			var oViewModel = this.getModel("multipleSkillModel");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");
			if (sSelectedYear == new Date().getFullYear()) {
				oViewModel.setProperty("/editable", true);
			} else {
				oViewModel.setProperty("/editable", false);
			}

			oViewModel.setProperty("/selectedEmployee", {});
			oViewModel.setProperty("/currentEmployee", null);
			oViewModel.setProperty("/skillPool", []);
			oViewModel.setProperty("/employeeSkill", []);
			this._getEmployeeList();
			// oViewModel.setProperty("/employeeList", []);
		},
		onSelectEmployee: function (oEvent) {

			var sPernr = oEvent.getSource().data("Pernr");
			var oViewModel = this.getModel("multipleSkillModel");
			var oEmployee = this._findEmployee(oViewModel, sPernr);

			if (oEmployee) {
				oViewModel.setProperty("/currentEmployee", _.cloneDeep(oEmployee));
				this._getEmployeeSkill();
			}
		},
		onCreateSkill: function (oEvent) {
			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var oNewEntry = oModel.createEntry("/SkillPoolSet");

			oViewModel.setProperty("/currentSkill", _.clone(oNewEntry.getObject()));
			oViewModel.setProperty("/currentSkill/Actve", true);
			oModel.deleteCreatedEntry(oNewEntry);
			this._callCreateSkillDialog();
		},

		onModifySkill: function (oEvent) {
			var sSklid = oEvent.getSource().data("Sklid");
			var sSource = oEvent.getSource().data("Source");
			var oViewModel = this.getModel("multipleSkillModel");
			var oSkill = this._findSkill(oViewModel, sSource, sSklid);

			if (oSkill) {
				oViewModel.setProperty("/currentSkill", _.cloneDeep(oSkill));
				this._callUpdateSkillDialog();
			}
		},
		onSaveEmployeeSkill: function (oEvent) {
			var that = this;
			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var oCurrentEmployee = oViewModel.getProperty("/currentEmployee");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");
			var aEmployeeSkill = oViewModel.getProperty("/employeeSkill");
			var bError = false;
			if (aEmployeeSkill) {
				//--Checks
				if(aEmployeeSkill.length>0){
					aEmployeeSkill.forEach((oSkill)=>{
						if(oSkill.Avlbl === null || oSkill.Avlbl === undefined || oSkill.Avlbl === "" ){
							that.alertMessage("E", "MESSAGE_ERROR", "CURRENT_MUST_BE_FILLED", [oSkill.Skltx]);
							bError = true;
						}
						if(oSkill.Trget === null || oSkill.Trget === undefined || oSkill.Trget === "" ){
							that.alertMessage("E", "MESSAGE_ERROR", "TARGET_MUST_BE_FILLED", [oSkill.Skltx]);
							bError = true;
						}
						if(oSkill.Dpexp.trim().length === 0){
							that.alertMessage("E", "MESSAGE_ERROR", "DESCRIPTION_MUST_BE_FILLED", [oSkill.Skltx]);
							bError = true;
						}
					});
				}
				if(bError){
					return;
				}
				//--Checks



				var oNewEntry = oModel.createEntry("/EmployeeSet");
				oViewModel.setProperty("/selectedEmployee", _.clone(oNewEntry.getObject()));
				var oSelectedEmployee = oViewModel.getProperty("/selectedEmployee")
				oSelectedEmployee.Evprd = sSelectedYear.toString();
				oSelectedEmployee.Pernr = oCurrentEmployee.Pernr;
				oSelectedEmployee.EmployeeSkillSet = aEmployeeSkill;
				var that = this;
				this.openBusyFragment("SKILL_BEING_SAVED", []);
				oModel.create("/EmployeeSet", oSelectedEmployee, {
					success: function (oData, oResponse) {
						/* Close busy indicator*/
						that.closeBusyFragment();
						/* Success message*/
						that.alertMessage("S", "MESSAGE_SUCCESSFUL", "SAVE_SKILL_SUCCESSFUL", []);
					},
					error: function (oError) {
						that.closeBusyFragment();
					},
					async: true
				});
			}
		},
		onCancelCreateDialog: function (oEvent) {
			this._oCreateSkillDialog.close();
			this._oCreateSkillDialog.destroy();
			this._oCreateSkillDialog = null;
		},
		onCancelUpdateDialog: function (oEvent) {
			this._oUpdateSkillDialog.close();
			this._oUpdateSkillDialog.destroy();
			this._oUpdateSkillDialog = null;
		},
		onDragStart: function (oEvent) {
			var oDraggedRow = oEvent.getParameter("target");
			var oDragSession = oEvent.getParameter("dragSession");

			// keep the dragged row context for the drop action
			oDragSession.setComplexData("draggedRowContext", oDraggedRow.oBindingContexts.multipleSkillModel);
		},
		onDropSkillPool: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession");
			var oDraggedRowContext = oDragSession.getComplexData("draggedRowContext");
			if (!oDraggedRowContext) {
				return;
			}

			var oRowData = oDraggedRowContext.getModel().getProperty(oDraggedRowContext.getPath());
			if (oRowData.Sklid) {
				this._deleteEmployeeSkill(oRowData);
			}
		},
		onDropEmployeeSkill: function (oEvent) {
			var oDragSession = oEvent.getParameter("dragSession");
			var oDraggedRowContext = oDragSession.getComplexData("draggedRowContext");

			if (!oDraggedRowContext) {
				return;
			}

			var oRowData = oDraggedRowContext.getModel().getProperty(oDraggedRowContext.getPath());
			if (oRowData.Sklid) {
				this._createEmployeeSkill(oRowData.Sklid);
			}
		},
		onSaveSkill: function (oEvent) {
			var oForm = sap.ui.getCore().byId("idNewSkillForm");
			var oViewModel = this.getModel("multipleSkillModel");
			var oNewSkill = oViewModel.getProperty("/currentSkill");
			var oModel = this.getModel();
			var that = this;

			if (oForm) {
				//First validate form before save
				if (this._validateForm(oForm)) {
					this.openBusyFragment("SKILL_BEING_SAVED", []);
					oModel.create("/SkillPoolSet", oNewSkill, {
						success: function (oData, oResponse) {
							/* Close create dialog */
							that._oCreateSkillDialog.close();
							that._oCreateSkillDialog.destroy();
							that._oCreateSkillDialog = null;

							/* Close busy indicator*/
							that.closeBusyFragment();

							/* Success message*/
							that.alertMessage("S", "MESSAGE_SUCCESSFUL", "SAVE_SKILL_SUCCESSFUL", []);

							/* Trigger refresh*/
							that._getEmployeeSkill();
						},
						error: function (oError) {
							that.closeBusyFragment();
						},
						async: true
					});
				}
			}
		},
		onDeleteEmployeeSkill: function (oEvent) {
			var oButton = oEvent.getSource();
			var oSkill = oButton.data();
			this._deleteEmployeeSkill(oSkill);
		},
		onStartIntro: function () {
			const that = this;
			const driver = window.driver.js.driver;
			const driverObj = driver({
				popoverClass: 'driverjs-theme',
				// overlayColor: 'blue',
				overlayOpacity: 0.7,
				showProgress: true,
				steps: [
					{ element: "#" + that.byId("idEmployeeListTable").$().attr("id"), popover: { title: 'Çalışan Seçimi', description: 'Çalışan listesinden ilgili satır seçilir. Seçilen çalışan ile birlikte ekranın sağ tarafındaki <em>Beceri Havuzu</em> ve <em>Çalışan Becerileri</em> bölümleri güncellenir.', side: "right", align: 'start' } },
					{ element: "#" + that.byId("idSkillPoolTable").$().attr("id"), popover: { title: 'Beceri Havuzu', description: 'Beceri havuzu, çalışanlara atanacak olan becerileri içerir. Çalışan seçildikten sonra, çalışana eklenmemiş aktif beceriler bu tabloda listelenir. İlgili satır sürükle ve bırak işlemiyle, <em>Çalışan Becerileri</em> listesine aktarılabilir.', side: "top", align: 'center' } },
					{ element: "#" + that.byId("idEmployeeSkillsTable").$().attr("id"), popover: { title: 'Çalışan Becerileri', description: 'Çalışana eklenen ve takip edilen beceriler bu bölümdeki listede bulunur. Yıl boyunca buradaki listede çalışan bazında becerileri takip edebilirsiniz.', side: "left", align: 'start' } },
					{ element: "#" + that.byId("idCreateNewSkillButton").$().attr("id"), popover: { title: 'Yeni Beceri', description: 'Beceri havuzuna yeni bir beceri eklemek için burayı kullanabilirsiniz.Eklediğiniz beceriyi seçtiğiniz çalışana ekleyebilirsiniz.', side: "bottom", align: 'center' } },
					{ element: "#" + that.byId("idSaveSkillPointsButton").$().attr("id"), popover: { title: 'Puanları Kaydet ', description: 'Seçili çalışan için girilen Mevcut, Hedef ve Gerçekleşen puanlamamalarınızı kaydetmenize yarar.', side: "bottom", align: 'center' } },
				]
			});

			driverObj.drive();
		},
		onUpdateSkill: function (oEvent) {
			var oForm = sap.ui.getCore().byId("idModifySkillForm");
			var oViewModel = this.getModel("multipleSkillModel");
			var oNewSkill = oViewModel.getProperty("/currentSkill");
			var oModel = this.getModel();
			var that = this;

			if (oForm) {
				//First validate form before save
				if (this._validateForm(oForm)) {
					this.openBusyFragment("SKILL_BEING_UPDATED", []);
					oModel.create("/SkillPoolSet", oNewSkill, {
						success: function (oData, oResponse) {
							/* Close update dialog */
							that._oUpdateSkillDialog.close();
							that._oUpdateSkillDialog.destroy();
							that._oUpdateSkillDialog = null;

							/* Close busy indicator*/
							that.closeBusyFragment();

							/* Success message*/
							that.alertMessage("S", "MESSAGE_SUCCESSFUL", "UPDATE_SKILL_SUCCESSFUL", []);

							/* Trigger refresh*/
							that._getEmployeeSkill();
						},
						error: function (oError) {
							that.closeBusyFragment();
						},
						async: true
					});
				}
			}
		},
		onActiveSkill: function (oEvent) {
			var oModel = this.getModel();
			var that = this;
			var sSklid = oEvent.getSource().data("Sklid");
			var oViewModel = this.getModel("multipleSkillModel");
			var oSkill = this._findSkill(oViewModel, 'POOL', sSklid);

			if (oSkill) {
				this.openBusyFragment("SKILL_BEING_UPDATED", []);

				oModel.create("/SkillPoolSet", oSkill, {
					success: function (oData, oResponse) {
						/* Close busy indicator*/
						that.closeBusyFragment();
					},
					error: function (oError) {
						that.closeBusyFragment();
					},
					async: true
				});
			}
		},
		onDeleteSkill: function (oEvent) {
			var sSklid = oEvent.getSource().data("Sklid");
			var oViewModel = this.getModel("multipleSkillModel");
			var oSkill = this._findSkill(oViewModel, 'POOL', sSklid);
			var that = this;
			// var sTitle = this.getText("DELETE_SKILL_WARNING");

			var doDelete = function () {
				var oModel = that.getModel();
				var sPath = oModel.createKey("/SkillPoolSet", {
					"Sklid": sSklid
				});
				that.openBusyFragment("SKILL_BEING_DELETED", []);
				oModel.remove(sPath, {
					success: function (oData, oResponse) {
						/* Close busy indicator*/
						that.closeBusyFragment();

						/* Success message*/
						that.alertMessage("S", "MESSAGE_SUCCESSFUL", "DELETE_SKILL_SUCCESSFUL", []);

						/* Trigger refresh*/
						that._getEmployeeSkill();
					},
					error: function (oError) {
						/* Close busy indicator*/
						that.closeBusyFragment();
					}
				});
			};

			this.confirmDialog({
				title: this.getText("DELETE_SKILL_WARNING", []),
				html: this.getText("SKILL_WILL_BE_DELETED", [oSkill.Skltx]),
				icon: "warning",
				confirmButtonText: this.getText("DELETE_ACTION"),
				confirmCallbackFn: doDelete,
			});



			// var oContent = new sap.m.VBox({
			// 	items: [
			// 		new sap.m.Text({
			// 			text: '{i18n>DELETE_SKILL_CONFIRMATION}'
			// 		}),
			// 		new sap.m.HBox({
			// 			items: [
			// 				new sap.m.VBox({
			// 					items: [
			// 						new sap.m.Text({
			// 							text: '{i18n>SKLTX}:'
			// 						}).addStyleClass("ptBoldText")
			// 					]
			// 				}).addStyleClass("sapUiTinyMarginEnd"),
			// 				new sap.m.VBox({
			// 					items: [
			// 						new sap.m.Text({
			// 							text: oSkill.SKLTX
			// 						})
			// 					]
			// 				})
			// 			]
			// 		}).addStyleClass("sapUiTinyMargin"),
			// 		new sap.m.Text({
			// 			text: "{i18n>DO_YOU_CONFIRM}"
			// 		}),
			// 		new sap.m.MessageStrip({
			// 			text: "{i18n>IRREVERSIBLE_ACTION_WARNING}",
			// 			type: "Warning",
			// 			showIcon: true
			// 		}).addStyleClass("sapUiTinyMargin")

			// 	]
			// }).addStyleClass("sapUiTinyMargin");
			// 

			// var doDelete = function () {
			// 	var oModel = that.getModel();
			// 	var sPath = oModel.createKey("/SkillPoolSet", {
			// 		"Sklid": sSklid
			// 	});
			// 	that.openBusyFragment("SKILL_BEING_DELETED", []);
			// 	oModel.remove(sPath, {
			// 		success: function (oData, oResponse) {
			// 			/* Close busy indicator*/
			// 			that.closeBusyFragment();

			// 			/* Success message*/
			// 			that.alertMessage("S", "MESSAGE_SUCCESSFUL", "DELETE_SKILL_SUCCESSFUL", []);

			// 			/* Trigger refresh*/
			// 			that._getEmployeeSkill();
			// 		},
			// 		error: function (oError) {
			// 			/* Close busy indicator*/
			// 			that.closeBusyFragment();
			// 		}
			// 	});
			// };

			// var oBeginButtonProp = {
			// 	type: "Reject",
			// 	text: this.getText("DELETE_ACTION"),
			// 	icon: "sap-icon://delete",
			// 	onPressed: function () {
			// 		doDelete();
			// 	}
			// };

			// var oEndButtonProp = {
			// 	type: "Default",
			// 	text: this.getText("CANCEL_ACTION"),
			// 	icon: "sap-icon://sys-cancel",
			// 	onPressed: function () { }
			// };

			// this.getConfirmDialog(sTitle, "Warning", oContent, oBeginButtonProp, oEndButtonProp).open();
		},
		onSearchEmployee: function () {
			this._getEmployeeList();
		},
		onToggleFullScreen: function () {
			var oViewModel = this.getModel("multipleSkillModel");
			var bVisible = oViewModel.getProperty("/skillPoolVisible");

			oViewModel.setProperty("/skillPoolVisible", !bVisible);
		},
	    onSkillChanged: function(){
			this._recalculateSkillsFooter();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		_setPoolVisible: function (bVisible = true) {
			var oViewModel = this.getModel("multipleSkillModel");

			oViewModel.setProperty("/skillPoolVisible", bVisible);
		},
		_findEmployee: function (oViewModel, sPernr) {
			var oModel = this.getModel();
			var sYear = oViewModel.getProperty("/selectedYear");
			var oContext = oModel.getContext(`/EmployeeSet(Evprd='${sYear}',Pernr='${sPernr}')`)
			var oEmployee = oContext ? _.omit(oContext.getObject(), "__metadata") : null;

			return oEmployee;
		},
		_findSkill: function (oViewModel, sSource, sSklid) {
			var oModel = this.getModel();
			var oSkill;
			if (sSource === 'POOL') {
				oSkill = oViewModel.getProperty("/skillPool").filter(function (e) {
					return e.Sklid === sSklid;
				});
				return oSkill[0];
			} else if (sSource === 'EMPLOYEE') {
				var oSkillTemp = oViewModel.getProperty("/employeeSkill").filter(function (e) {
					return e.Sklid === sSklid;
				});
				if (oSkillTemp) {
					var oNewEntry = oModel.createEntry("/SkillPoolSet");
					oSkill = _.clone(oNewEntry.getObject());
					oModel.deleteCreatedEntry(oNewEntry);
					oSkill.Sklid = oSkillTemp[0].Sklid;
					oSkill.Skltx = oSkillTemp[0].Skltx;
					oSkill.Actve = true;
					return oSkill;
				}
			}
		},
		_createEmployeeSkill: function (sSklid) {
			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var that = this;
			var oCurrentEmployee = oViewModel.getProperty("/currentEmployee");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");
			var oNewEntry = oModel.createEntry("/EmployeeSkillSet");
			oViewModel.setProperty("/selectedSkill", _.clone(oNewEntry.getObject()));
			var oSelectedSkill = oViewModel.getProperty("/selectedSkill")
			oSelectedSkill.Evprd = sSelectedYear.toString();
			oSelectedSkill.Pernr = oCurrentEmployee.Pernr;
			oSelectedSkill.Sklid = sSklid;
			this.openBusyFragment("SKILL_BEING_SAVED", []);
			oModel.create("/EmployeeSkillSet", oSelectedSkill, {
				success: function (oData, oResponse) {
					/* Close busy indicator*/
					that.closeBusyFragment();

					/* Trigger refresh*/
					that._getEmployeeSkill();
					that._getEmployeeSingle();
				},
				error: function (oError) {
					that.closeBusyFragment();
				},
				async: true
			});

		},
		_deleteEmployeeSkill: function (oSkill) {
			var that = this;
			var oModel = that.getModel();
			var sPath = oModel.createKey("/EmployeeSkillSet", {
				"Sklid": oSkill.Sklid,
				"Evprd": oSkill.Evprd,
				"Pernr": oSkill.Pernr
			});
			that.openBusyFragment("SKILL_BEING_DELETED", []);
			oModel.remove(sPath, {
				success: function (oData, oResponse) {
					/* Close busy indicator*/
					that.closeBusyFragment();

					/* Trigger refresh*/
					that._getEmployeeSkill();
					that._getEmployeeSingle();
				},
				error: function (oError) {
					/* Close busy indicator*/
					that.closeBusyFragment();
				}
			});
		},
		_callUpdateSkillDialog: function () {
			if (!this._oUpdateSkillDialog) {
				this._oUpdateSkillDialog = sap.ui.xmlfragment("hcm.ux.mlsk.fragment.UpdateSkill", this);
				this.getView().addDependent(this._oUpdateSkillDialog);
			}
			var oForm = sap.ui.getCore().byId("idModifySkillForm");
			if (oForm) {
				this._clearValidationTraces(oForm);
			}
			this._oUpdateSkillDialog.open();
		},
		_callCreateSkillDialog: function () {
			if (!this._oCreateSkillDialog) {
				this._oCreateSkillDialog = sap.ui.xmlfragment("hcm.ux.mlsk.fragment.CreateSkill", this);
				this.getView().addDependent(this._oCreateSkillDialog);
			}
			var oForm = sap.ui.getCore().byId("idNewSkillForm");
			if (oForm) {
				this._clearValidationTraces(oForm);
			}
			this._oCreateSkillDialog.open();
		},
		_onMultipleSkillMatched: function (oEvent) {
			this._getEmployeeList();
		},
		_getEmployeeSingle: function () {

			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var that = this;
			var sPernr = oViewModel.getProperty("/currentEmployee/Pernr");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");

			var sPath = oModel.createKey("/EmployeeSet", {
				Evprd: sSelectedYear,
				Pernr: sPernr
			});


			oModel.read(sPath, {
				success: function (oData, oResponse) {
					var aEmp = oViewModel.getProperty("/employeeList");

					var sIndex = _.findIndex(aEmp, ["Pernr", sPernr]);
					if (sIndex !== -1) {
						aEmp[sIndex] = _.clone(oData);
					}
					//console.log(oData.results);
					oViewModel.setProperty("/employeeList", _.cloneDeep(aEmp));

				},
				error: function (oError) {
				}
			});

		},

		_getEmployeeList: function () {
			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");
			var sSearch = oViewModel.getProperty("/employeeSearchQuery") || null;
			var aFilter = [new Filter("Evprd", FilterOperator.EQ, sSelectedYear)];
			if (sSearch) {
				aFilter.push(new Filter("Query", FilterOperator.EQ, sSearch))
			}
			this.byId("idEmployeeListTable").getBinding("items").filter(aFilter);


			// return;

			// var sPath = "/EmployeeSet";
			// var that = this;
			// var aFilters = []
			// aFilters.push(new Filter("Evprd", FilterOperator.EQ, sSelectedYear));

			// //Refresh data first
			// oViewModel.setProperty("/employeeList", []);

			// //Set busy text
			// this.openBusyFragment("EMPLOYEE_LIST_BEING_FETCHED", []);
			// oModel.read(sPath, {
			// 	filters: aFilters,
			// 	success: function (oData, oResponse) {
			// 		//console.log(oData.results);
			// 		oViewModel.setProperty("/employeeList", _.cloneDeep(oData.results));
			// 		that.closeBusyFragment();
			// 	},
			// 	error: function (oError) {
			// 		that.closeBusyFragment();
			// 	}
			// });

		},
		_recalculateSkillsFooter: function () {
			var oViewModel = this.getModel("multipleSkillModel");
			var aSkills = oViewModel.getProperty("/employeeSkill");
			var oSkillFooter = {
				currentAverage: null,
				targetAverage: null,
				realisedAverage: null
			};
			var currentTotal = 0;
			var targetTotal = 0;
			var realisedTotal = 0;

			aSkills.forEach((oSkill, i) => {
				currentTotal = oSkill.Avlbl !== "" ? currentTotal + parseInt(oSkill.Avlbl,10) : currentTotal;
				targetTotal = oSkill.Trget !== "" ? targetTotal + parseInt(oSkill.Trget,10) : targetTotal;
				realisedTotal = oSkill.Realz !== "" ? realisedTotal + parseInt(oSkill.Realz,10) : realisedTotal;
			});

			if (aSkills.length > 0) {
				oSkillFooter = {
					currentAverage: formatter.formatWeighting(parseFloat(currentTotal / aSkills.length).toFixed(2),2,false),
					targetAverage: formatter.formatWeighting(parseFloat(targetTotal / aSkills.length).toFixed(2),2,false),
					realisedAverage: formatter.formatWeighting(parseFloat(realisedTotal / aSkills.length).toFixed(2),2,false),
				};
			}

			oViewModel.setProperty("/employeeSkillsFooter", oSkillFooter);

		},
		_getEmployeeSkill: function () {
			var oModel = this.getModel();
			var oViewModel = this.getModel("multipleSkillModel");
			var oCurrentEmployee = oViewModel.getProperty("/currentEmployee");
			var sSelectedYear = oViewModel.getProperty("/selectedYear");
			var sPath = oModel.createKey("/EmployeeSet", {
				"Evprd": sSelectedYear,
				"Pernr": oCurrentEmployee.Pernr
			});
			var sExpand = "SkillPoolSet,EmployeeSkillSet";
			var that = this;

			//Refresh data first
			oViewModel.setProperty("/skillPool", []);
			oViewModel.setProperty("/employeeSkill", []);

			//--Set employee skill pool visible
			// this._setPoolVisible();

			//Set busy text
			this.openBusyFragment("EMPLOYEE_LIST_BEING_FETCHED", []);
			oModel.read(sPath, {
				urlParameters: {
					"$expand": sExpand
				},
				success: function (oData, oResponse) {
					// if (oData.SkillPoolSet.results.length > 0) {
					// 	that._setPoolVisible(true);
					// } else {
					// 	that._setPoolVisible(false);
					// }

					oViewModel.setProperty("/skillPool", _.cloneDeep(oData.SkillPoolSet.results));
					oViewModel.setProperty("/employeeSkill", _.cloneDeep(oData.EmployeeSkillSet.results));
					that._recalculateSkillsFooter();
					that.closeBusyFragment();
				},
				error: function (oError) {
					that.closeBusyFragment();
				}
			});
		},
		_initiateModel: function () {
			var oViewModel = this.getModel("multipleSkillModel");
			var that = this;

			oViewModel.setData({
				busy: false,
				errorList: null,
				yearList: that._initiateYears(),
				selectedYear: new Date().getFullYear(),
				editable: true,
				currentEmployee: null,
				selectedEmployee: {},
				currentSkill: null,
				selectedSkill: {},
				employeeSearchQuery: null,
				skillPoolVisible: true,
				employeeSkillsFooter: {
					currentAverage: null,
					targetAverage: null,
					realisedAverage: null
				},
				evaluationList: [
					{
						Key: "",
						Text: "Bir değer seçiniz",
						Icon: null
					},
					{
						Key: "0",
						Text: "Bilgi/Tecrübe/Uzmanlık Sahibi Değil",
						Icon: "sap-icon://customfont/circle_0"
					}, {
						Key: "1",
						Text: "Bilir,Uygulamaz",
						Icon: "sap-icon://customfont/circle_90"
					}, {
						Key: "2",
						Text: "Bilir ve Gözetim Altında Uygulayabilir",
						Icon: "sap-icon://customfont/circle_180"
					}, {
						Key: "3",
						Text: "Bilir ve Uygulayabilir",
						Icon: "sap-icon://customfont/circle_270"
					}, {
						Key: "4",
						Text: "Bilir,Uygulayabilir ve Eğitebilir",
						Icon: "sap-icon://customfont/circle_360"
					}]
			});

		},

		_initiateYears: function () {
			var sToday = new Date().getFullYear();
			var aDates = [];
			while (sToday > 2021) {
				var oDate = {
					"Year": sToday
				};
				aDates.push(oDate);
				sToday--;
			}
			return aDates;
		},
		_validateForm: function (oForm) {
			var oValidator = new FormValidator(this);

			if (oForm) {
				oValidator.clearTraces(oForm);
				var sResult = oValidator.validate(oForm);
				return sResult;
			} else {
				return true;
			}
		},
		_clearValidationTraces: function (oForm) {
			var oValidator = new FormValidator(this);
			if (oForm) {
				oValidator.clearTraces(oForm);
			}
		}

	});
});