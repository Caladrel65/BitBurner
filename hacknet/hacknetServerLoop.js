// Should be run directly: yes
// Description: Script that automatically maintains growth of hacknet servers, script
// will burn through all available money. Can be run with a timeout period if desired.

import {formattedTime} from "utils/formattingTools.js" 

// Define types for hacknet upgrade targets
const HacknetItems = Object.freeze({
	NewNode: Symbol("New Node"),
	Level: Symbol("Level"),
	RAM: Symbol("RAM"),
	Cores: Symbol("Cores"),
	Cache: Symbol("Cache")
})

/** @param {NS} ns **/
export async function main(ns) {
	// Pull Hacknet constants
	const hacknetConstants = ns.formulas.hacknetServers.constants;
	ns.disableLog("sleep");
	ns.disableLog("getServerMoneyAvailable");
	ns.clearLog();
	ns.printf("Waiting to purchase first node ($%s)", ns.formatNumber(ns.hacknet.getPurchaseNodeCost()));
	ns.tail();

	// duration is an optional argument that allows a limited duration of this script (in hours)
	let duration = ns.args[0];
	// noLimit is used when duration was left empty or set to 0
	let noLimit = ns.args.length == 0 || duration == 0;
	// durationHour is the amount of milliseconds in one hour
	const durationHour = 1000 * 60 * 60;
	// startTime is a time that represents when this script started running
	let startTime = Date.now();
	// endTime is a time that represents when this script will automatically end
	const endTime = startTime + duration * durationHour;

	// Purchase the first node as soon as possible
	while (ns.hacknet.numNodes() == 0) {
		if (ns.getServerMoneyAvailable("home") > ns.hacknet.getPurchaseNodeCost()) {
			ns.hacknet.purchaseNode();
		} else {
			await ns.sleep(1000)
		}
	}

	while (noLimit || Date.now() < endTime) {
		let wasPurchased = false;

		// numPurchasedNodes is the number of current Hacknet Nodes
		let numPurchasedNodes = ns.hacknet.numNodes();

		// Exit condition: All Hacknet Nodes are fully upgraded
		if (numPurchasedNodes == ns.hacknet.maxNumNodes()) {
			let notAllUpgraded = false;
			for (let nodeIndex of numPurchasedNodes) {
				// node is the Current Node
				let node = ns.hacknet.getNodeStats(nodeIndex);
				// isNodeFullyUpgraded ...self explanatory
				let isNodeFullyUpgraded = node.level == hacknetConstants.MaxLevel &&
					node.ram == hacknetConstants.MaxRam &&
					node.cores == hacknetConstants.MaxCores &&
					node.cache == hacknetConstants.MaxCache;

				if (!isNodeFullyUpgraded) {
					notAllUpgraded = true;
					break;
				}
			}
			// Stop running if servers are maxed out
			if (!notAllUpgraded) {
				ns.tprint("All Hacknet Servers fully upgraded");
				ns.exit();
			}
		}

		// nodeIndex is the index of the selected Hacknet Node
		let nodeIndex = 0;
		// Default to purchasing a new node
		let itemType = HacknetItems.NewNode;
		let purchaseCost = ns.hacknet.getPurchaseNodeCost();
		let bestRatio = getNewNodeRatio(ns, numPurchasedNodes);

		// Iterate through all nodes and select the best hashes/second/cost ratio option
		for (let i = 0; i < numPurchasedNodes; i++) {
			if (isBetterPurchase(ns, i, bestRatio, HacknetItems.Level)) {
				itemType = HacknetItems.Level;
				nodeIndex = i;
				bestRatio = getUpgradeRatio(ns, i, HacknetItems.Level);
				purchaseCost = ns.hacknet.getLevelUpgradeCost(i);
			}
			if (isBetterPurchase(ns, i, bestRatio, HacknetItems.RAM)) {
				itemType = HacknetItems.RAM;
				nodeIndex = i;
				bestRatio = getUpgradeRatio(ns, i, HacknetItems.RAM);
				purchaseCost = ns.hacknet.getRamUpgradeCost(i);
			}
			if (isBetterPurchase(ns, i, bestRatio, HacknetItems.Cores)) {
				itemType = HacknetItems.Cores;
				nodeIndex = i;
				bestRatio = getUpgradeRatio(ns, i, HacknetItems.Cores);
				purchaseCost = ns.hacknet.getCoreUpgradeCost(i);
			}
			if (purchaseCost == Infinity) {
				itemType = HacknetItems.Cache;
				nodeIndex = i;
				bestRatio = 5318008;
				purchaseCost = ns.hacknet.getCacheUpgradeCost(i);
			}
		}

		// Best option selected, now attempt to purchase the selected item
		if (ns.getServerMoneyAvailable("home") > purchaseCost) {
			switch (itemType) {
				case HacknetItems.NewNode:
					wasPurchased = ns.hacknet.purchaseNode() != -1;
					break;
				case HacknetItems.Level:
					wasPurchased = ns.hacknet.upgradeLevel(nodeIndex);
					break;
				case HacknetItems.RAM:
					wasPurchased = ns.hacknet.upgradeRam(nodeIndex);
					break;
				case HacknetItems.Cores:
					wasPurchased = ns.hacknet.upgradeCore(nodeIndex);
					break;
				case HacknetItems.Cache:
					wasPurchased = ns.hacknet.upgradeCache(nodeIndex);
					break;
			}
		}

		// Determine how many seconds are left in this run (or -1 if it's infinite)
		let remainingDuration = noLimit ? -1 : Math.floor((endTime - Date.now()) / 1000);
		// Print details about this script's status
		printHacknetStatus(ns, itemType, nodeIndex, purchaseCost, remainingDuration);

		// Sleep with duration based on whether we purchased an item this cycle
		wasPurchased ? await ns.sleep(20) : await ns.sleep(1000)
	}
	ns.tprint("Hacknet Server Manager duration finished");
}

/** @param {NS} ns **/
// getNewNodeRatio calculates the ratio of hashes/second/cost to purchase a new Hacknet Server
function getNewNodeRatio(ns, numPurchasedNodes) {
	// Typically the last node is the least-upgraded node
	let nodeIndex = numPurchasedNodes - 1;
	// Store the node stats object
	let existingNode = ns.hacknet.getNodeStats(nodeIndex);
	// The income a new node will (eventually) bring is the same as the least-upgraded node's production
	let incomeIncrease = ns.formulas.hacknetServers.hashGainRate(existingNode.level, 0, existingNode.ram, existingNode.cores);

	// Calculate cost for a new node AND upgrading it
	let cost = ns.hacknet.getPurchaseNodeCost();

	// Add costs for upgrading node, if applicable
	if (existingNode.level > 1) {
		cost += ns.formulas.hacknetServers.levelUpgradeCost(1, existingNode.level - 1);
	}
	if (existingNode.ram > 1) {
		cost += ns.formulas.hacknetServers.ramUpgradeCost(1, Math.log2(existingNode.ram) - 1);
	}
	if (existingNode.cores > 1) {
		cost += ns.formulas.hacknetServers.coreUpgradeCost(1, existingNode.cores - 1);
	}

	// Return hashes/second/cost ratio for a new upgraded node
	return incomeIncrease / cost;
}

/** @param {NS} ns **/
// isBetterPurchase determines whether purchasing the next upgrade of a certain type on a
// Hacknet Server will generate better H/s for the price than the previous best option
function isBetterPurchase(ns, nodeIndex, previousRatio, itemType) {
	let existingNode = ns.hacknet.getNodeStats(nodeIndex);

	switch (itemType) {
		case HacknetItems.Level:
			if (existingNode.level == ns.formulas.hacknetServers.constants.MaxLevel) {
				return false;
			}
			break;
		case HacknetItems.RAM:
			if (existingNode.ram == ns.formulas.hacknetServers.constants.MaxRam) {
				return false;
			}
			break;
		case HacknetItems.Cores:
			if (existingNode.cores == ns.formulas.hacknetServers.constants.MaxCores) {
				return false;
			}
			break;
	}

	let upgradeRatio = getUpgradeRatio(ns, nodeIndex, itemType);

	return upgradeRatio > previousRatio;
}

/** @param {NS} ns **/
// getUpgradeRatio returns the H/s/cost value for a Hacknet Server upgrade
function getUpgradeRatio(ns, nodeIndex, itemType) {
	let existingNode = ns.hacknet.getNodeStats(nodeIndex);

	let existingIncome = ns.formulas.hacknetServers.hashGainRate(existingNode.level, 0, existingNode.ram, existingNode.cores);
	let upgradedIncome = 0.0;
	let cost = 0;

	switch (itemType) {
		case HacknetItems.Level:
			if (existingNode.level == ns.formulas.hacknetServers.MaxLevel) {
				return upgradedIncome;
			}
			upgradedIncome = ns.formulas.hacknetServers.hashGainRate(existingNode.level + 1, 0, existingNode.ram, existingNode.cores);
			cost = ns.hacknet.getLevelUpgradeCost(nodeIndex);
			break;
		case HacknetItems.RAM:
			if (existingNode.ram == ns.formulas.hacknetServers.MaxRam) {
				return upgradedIncome;
			}
			upgradedIncome = ns.formulas.hacknetServers.hashGainRate(existingNode.level, 0, existingNode.ram * 2, existingNode.cores);
			cost = ns.hacknet.getRamUpgradeCost(nodeIndex);
			break;
		case HacknetItems.Cores:
			if (existingNode.cores == ns.formulas.hacknetServers.MaxCores) {
				return upgradedIncome;
			}
			upgradedIncome = ns.formulas.hacknetServers.hashGainRate(existingNode.level, 0, existingNode.ram, existingNode.cores + 1);
			cost = ns.hacknet.getCoreUpgradeCost(nodeIndex);
			break;
	}

	let incomeIncrease = upgradedIncome - existingIncome;

	return incomeIncrease / cost;
}

/** @param {NS} ns **/
function printHacknetStatus(ns, itemType, nodeIndex, purchaseCost, remainingSeconds) {
	let hashesPerSecond = totalHashesPerSecond(ns);
	let totalSeconds = (purchaseCost - ns.getServerMoneyAvailable("home")) / (hashesPerSecond * 250e3);

	ns.clearLog();
	if (remainingSeconds != -1) {
		ns.printf("Time remaining before script exit: %s", formattedTime(ns, remainingSeconds));
	}
	ns.printf("Target item: %s", itemType.toString());
	if (itemType != HacknetItems.NewNode) {
		ns.printf("Index: %d", nodeIndex);
	}
	ns.printf("Target price: $%s", ns.formatNumber(purchaseCost, 2));
	ns.printf("Current Hacknet Production/Second: %sh/s ($%s/s)", ns.formatNumber(hashesPerSecond), ns.formatNumber(hashesPerSecond * 250e3));
}

/** @param {NS} ns **/
function totalHashesPerSecond(ns) {
	let hashesPerSecond = 0.0;
	let numPurchasedNodes = ns.hacknet.numNodes();
	
	for (let i = 0; i < numPurchasedNodes; i++) {
		hashesPerSecond += ns.hacknet.getNodeStats(i).production;
	}

	return hashesPerSecond;
}
