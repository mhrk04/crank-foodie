// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CrankFoodie {
    enum ReportType {
        PestObject,
        FoodPoisoning,
        DirtyToilet,
        DirtyDiningArea,
        BadSmell,
        PositiveCleanliness
    }

    struct Restaurant {
        uint256 id;
        string name;
        string area;
        string latitude;
        string longitude;
        uint256 priceRange;
        string metadataURI;
        bool active;
        address registeredBy;
        uint256 createdAt;
    }

    struct Report {
        uint256 id;
        uint256 restaurantId;
        address reporter;
        ReportType reportType;
        uint8 severity;
        uint8 starRating;
        string[] evidenceURIs;
        string detailsURI;
        uint256 createdAt;
        bool verified;
    }

    struct CleaningLog {
        uint256 id;
        uint256 restaurantId;
        address cleaner;
        uint8 cleanlinessScore;
        string evidenceURI;
        uint256 cleanedAt;
    }

    address public owner;
    uint256 public restaurantCount;
    uint256 public reportCount;
    uint256 public cleaningLogCount;

    mapping(uint256 => Restaurant) private restaurants;
    mapping(uint256 => Report) private reports;
    mapping(uint256 => CleaningLog) private cleaningLogs;
    mapping(uint256 => uint256[]) private restaurantReportIds;
    mapping(uint256 => uint256[]) private restaurantCleaningLogIds;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RestaurantRegistered(uint256 indexed restaurantId, string name, string area, address indexed registeredBy);
    event RestaurantStatusUpdated(uint256 indexed restaurantId, bool active);
    event HygieneReportSubmitted(
        uint256 indexed reportId,
        uint256 indexed restaurantId,
        address indexed reporter,
        ReportType reportType,
        uint8 severity,
        uint8 starRating,
        uint256 imageCount
    );
    event HygieneReportVerified(uint256 indexed reportId, bool verified);
    event CleaningLogSubmitted(uint256 indexed cleaningLogId, uint256 indexed restaurantId, address indexed cleaner, uint8 cleanlinessScore);

    error NotOwner();
    error InvalidRestaurant();
    error InvalidReport();
    error InvalidPriceRange();
    error InvalidSeverity();
    error InvalidRating();
    error InvalidCleanlinessScore();
    error TooManyImages();
    error EmptyName();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier restaurantExists(uint256 restaurantId) {
        if (restaurantId == 0 || restaurantId > restaurantCount || !restaurants[restaurantId].active) {
            revert InvalidRestaurant();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function registerRestaurant(
        string calldata name,
        string calldata area,
        string calldata latitude,
        string calldata longitude,
        uint256 priceRange,
        string calldata metadataURI
    ) external returns (uint256 restaurantId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (priceRange == 0) revert InvalidPriceRange();

        restaurantId = ++restaurantCount;
        restaurants[restaurantId] = Restaurant({
            id: restaurantId,
            name: name,
            area: area,
            latitude: latitude,
            longitude: longitude,
            priceRange: priceRange,
            metadataURI: metadataURI,
            active: true,
            registeredBy: msg.sender,
            createdAt: block.timestamp
        });

        emit RestaurantRegistered(restaurantId, name, area, msg.sender);
    }

    function setRestaurantActive(uint256 restaurantId, bool active) external onlyOwner {
        if (restaurantId == 0 || restaurantId > restaurantCount) revert InvalidRestaurant();
        restaurants[restaurantId].active = active;
        emit RestaurantStatusUpdated(restaurantId, active);
    }

    function submitReport(
        uint256 restaurantId,
        ReportType reportType,
        uint8 severity,
        uint8 starRating,
        string[] calldata evidenceURIs,
        string calldata detailsURI
    ) external restaurantExists(restaurantId) returns (uint256 reportId) {
        if (severity == 0 || severity > 5) revert InvalidSeverity();
        if (starRating == 0 || starRating > 5) revert InvalidRating();
        if (evidenceURIs.length > 3) revert TooManyImages();

        reportId = ++reportCount;
        Report storage report = reports[reportId];
        report.id = reportId;
        report.restaurantId = restaurantId;
        report.reporter = msg.sender;
        report.reportType = reportType;
        report.severity = severity;
        report.starRating = starRating;
        report.detailsURI = detailsURI;
        report.createdAt = block.timestamp;

        for (uint256 i = 0; i < evidenceURIs.length; i++) {
            report.evidenceURIs.push(evidenceURIs[i]);
        }

        restaurantReportIds[restaurantId].push(reportId);
        emit HygieneReportSubmitted(reportId, restaurantId, msg.sender, reportType, severity, starRating, evidenceURIs.length);
    }

    function setReportVerified(uint256 reportId, bool verified) external onlyOwner {
        if (reportId == 0 || reportId > reportCount) revert InvalidReport();
        reports[reportId].verified = verified;
        emit HygieneReportVerified(reportId, verified);
    }

    function submitCleaningLog(
        uint256 restaurantId,
        uint8 cleanlinessScore,
        string calldata evidenceURI
    ) external restaurantExists(restaurantId) returns (uint256 cleaningLogId) {
        if (cleanlinessScore > 100) revert InvalidCleanlinessScore();

        cleaningLogId = ++cleaningLogCount;
        cleaningLogs[cleaningLogId] = CleaningLog({
            id: cleaningLogId,
            restaurantId: restaurantId,
            cleaner: msg.sender,
            cleanlinessScore: cleanlinessScore,
            evidenceURI: evidenceURI,
            cleanedAt: block.timestamp
        });

        restaurantCleaningLogIds[restaurantId].push(cleaningLogId);
        emit CleaningLogSubmitted(cleaningLogId, restaurantId, msg.sender, cleanlinessScore);
    }

    function getRestaurant(uint256 restaurantId) external view returns (Restaurant memory) {
        if (restaurantId == 0 || restaurantId > restaurantCount) revert InvalidRestaurant();
        return restaurants[restaurantId];
    }

    function getReport(uint256 reportId) external view returns (Report memory) {
        require(reportId > 0 && reportId <= reportCount, "invalid report");
        return reports[reportId];
    }

    function getCleaningLog(uint256 cleaningLogId) external view returns (CleaningLog memory) {
        require(cleaningLogId > 0 && cleaningLogId <= cleaningLogCount, "invalid cleaning log");
        return cleaningLogs[cleaningLogId];
    }

    function getRestaurantReportIds(uint256 restaurantId) external view returns (uint256[] memory) {
        if (restaurantId == 0 || restaurantId > restaurantCount) revert InvalidRestaurant();
        return restaurantReportIds[restaurantId];
    }

    function getRestaurantCleaningLogIds(uint256 restaurantId) external view returns (uint256[] memory) {
        if (restaurantId == 0 || restaurantId > restaurantCount) revert InvalidRestaurant();
        return restaurantCleaningLogIds[restaurantId];
    }

    function calculateHygieneScore(uint256 restaurantId) public view returns (uint8) {
        if (restaurantId == 0 || restaurantId > restaurantCount) revert InvalidRestaurant();

        int256 score = 88;
        uint256[] storage reportIds = restaurantReportIds[restaurantId];
        uint256[] storage cleaningIds = restaurantCleaningLogIds[restaurantId];

        for (uint256 i = 0; i < reportIds.length; i++) {
            Report storage report = reports[reportIds[i]];
            int256 severity = int256(uint256(report.severity));

            if (report.reportType == ReportType.PositiveCleanliness) {
                score += severity * 2;
            } else if (report.reportType == ReportType.FoodPoisoning) {
                score -= severity * 7;
            } else if (report.reportType == ReportType.PestObject) {
                score -= severity * 6;
            } else {
                score -= severity * 3;
            }

            if (report.starRating <= 2) score -= 3;
            else if (report.starRating == 5) score += 2;

            if (report.verified && report.reportType != ReportType.PositiveCleanliness) {
                score -= 4;
            }
        }

        uint256 recentCleaningCount;
        uint256 scoreSum;
        for (uint256 i = 0; i < cleaningIds.length; i++) {
            CleaningLog storage cleaningLog = cleaningLogs[cleaningIds[i]];
            scoreSum += cleaningLog.cleanlinessScore;
            if (block.timestamp - cleaningLog.cleanedAt <= 1 days) {
                recentCleaningCount++;
            }
        }

        if (recentCleaningCount > 0) {
            score += int256(recentCleaningCount * 3);
        }

        if (cleaningIds.length > 0) {
            uint256 averageCleanliness = scoreSum / cleaningIds.length;
            if (averageCleanliness >= 90) score += 6;
            else if (averageCleanliness >= 75) score += 3;
            else if (averageCleanliness < 50) score -= 8;
        }

        if (score < 0) return 0;
        if (score > 100) return 100;
        return uint8(uint256(score));
    }
}
