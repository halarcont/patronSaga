"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/rentals/reserveRental.ts
var reserveRental_exports = {};
__export(reserveRental_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(reserveRental_exports);
var { DynamoDB } = require("aws-sdk");
var handler = async function(event) {
  console.log("request:", JSON.stringify(event, void 0, 2));
  let carRentalReservationID = hashIt("" + event.rental_from + event.rental_to);
  console.log("carReservationID:", carRentalReservationID);
  if (event.run_type === "failCarRentalReservation") {
    throw new Error("Failed to book the car rental");
  }
  const dynamo = new DynamoDB();
  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "pk": { S: event.trip_id },
      "sk": { S: carRentalReservationID },
      "trip_id": { S: event.trip_id },
      "id": { S: carRentalReservationID },
      "rental": { S: event.rental },
      "rental_from": { S: event.rental_from },
      "rental_to": { S: event.rental_to },
      "transaction_status": { S: "pending" }
    }
  };
  let result = await dynamo.putItem(params).promise().catch((error) => {
    throw new Error(error);
  });
  console.log("inserted car rental reservation:");
  console.log(result);
  return {
    status: "ok",
    booking_id: carRentalReservationID
  };
};
function hashIt(s) {
  let myHash;
  for (let i = 0; i < s.length; i++) {
    myHash = Math.imul(31, myHash) + s.charCodeAt(i) | 0;
  }
  return "" + Math.abs(myHash);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
