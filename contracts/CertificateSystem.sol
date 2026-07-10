// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//  Interface for your CertificateNFT contract
interface ICertificateNFT {
    function issueCertificate(
        address student,
        string memory studentName,
        string memory course,
        string memory grade,
        string memory ipfsHash
    ) external returns (uint256);
    
    function verifyCertificate(uint256 tokenId) external;
    function revokeCertificate(uint256 tokenId) external;
    function getCertificate(uint256 tokenId) external view returns (
        string memory, string memory, string memory, uint256, string memory, bool, address
    );
    function getTotalCertificates() external view returns (uint256);
    function getStudentCertificates(address student) external view returns (uint256[] memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract CertificateSystem {
    // ============================================
    // STATE VARIABLES
    // ============================================
    address public admin;
    mapping(address => bool) public isLecturer;
    mapping(address => bool) public isStudent;
    address public nftContract;
    
    // ============================================
    // EVENTS
    // ============================================
    event LecturerAdded(address indexed lecturer);
    event LecturerRemoved(address indexed lecturer);
    event StudentRegistered(address indexed student);
    event CertificateIssued(uint256 indexed tokenId, address indexed student);
    event CertificateVerified(uint256 indexed tokenId, address indexed verifier);
    event CertificateRevoked(uint256 indexed tokenId);
    event NFTContractSet(address indexed nftContract);
    
    // ============================================
    // MODIFIERS
    // ============================================
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyLecturer() {
        require(isLecturer[msg.sender], "Only lecturer can perform this action");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor() {
        admin = msg.sender;
        isLecturer[msg.sender] = true; // Deployer becomes the first lecturer
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    //  Set the NFT contract address
    function setNFTContract(address _nftContract) public onlyAdmin {
        require(_nftContract != address(0), "Invalid NFT contract address");
        nftContract = _nftContract;
        emit NFTContractSet(_nftContract);
    }
    
    //  Add a new lecturer
    function addLecturer(address lecturer) public onlyAdmin {
        require(!isLecturer[lecturer], "Already a lecturer");
        isLecturer[lecturer] = true;
        emit LecturerAdded(lecturer);
    }
    
    // Remove a lecturer
    function removeLecturer(address lecturer) public onlyAdmin {
        require(isLecturer[lecturer], "Not a lecturer");
        require(lecturer != admin, "Cannot remove the admin");
        isLecturer[lecturer] = false;
        emit LecturerRemoved(lecturer);
    }
    
    //  Register a student
    function registerStudent(address student) public {
        require(!isStudent[student], "Already registered as a student");
        isStudent[student] = true;
        emit StudentRegistered(student);
    }
    
    // Register a student (admin only - optional)
    function registerStudentByAdmin(address student) public onlyAdmin {
        require(!isStudent[student], "Already registered as a student");
        isStudent[student] = true;
        emit StudentRegistered(student);
    }
    
    // ============================================
    // LECTURER FUNCTIONS
    // ============================================
    
    //  Issue a certificate (lecturer only)
    function issueCertificate(
        address student,
        string memory studentName,
        string memory course,
        string memory grade,
        string memory ipfsHash
    ) public onlyLecturer returns (uint256) {
        require(nftContract != address(0), "NFT contract not set");
        require(isStudent[student], "Student is not registered");
        
        ICertificateNFT nft = ICertificateNFT(nftContract);
        uint256 tokenId = nft.issueCertificate(student, studentName, course, grade, ipfsHash);
        
        emit CertificateIssued(tokenId, student);
        return tokenId;
    }
    
    //  Revoke a certificate (lecturer only)
    function revokeCertificate(uint256 tokenId) public onlyLecturer {
        require(nftContract != address(0), "NFT contract not set");
        ICertificateNFT(nftContract).revokeCertificate(tokenId);
        emit CertificateRevoked(tokenId);
    }
    
    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================
    
    //  Verify a certificate (anyone)
    function verifyCertificate(uint256 tokenId) public {
        require(nftContract != address(0), "NFT contract not set");
        ICertificateNFT(nftContract).verifyCertificate(tokenId);
        emit CertificateVerified(tokenId, msg.sender);
    }
    
    //  Get certificate details (anyone)
    function getCertificate(uint256 tokenId) public view returns (
        string memory studentName,
        string memory course,
        string memory grade,
        uint256 issueDate,
        string memory ipfsHash,
        bool isValid,
        address owner
    ) {
        require(nftContract != address(0), "NFT contract not set");
        return ICertificateNFT(nftContract).getCertificate(tokenId);
    }
    
    // Get total certificates (anyone)
    function getTotalCertificates() public view returns (uint256) {
        require(nftContract != address(0), "NFT contract not set");
        return ICertificateNFT(nftContract).getTotalCertificates();
    }
    
    // Get a student's certificates (anyone)
    function getStudentCertificates(address student) public view returns (uint256[] memory) {
        require(nftContract != address(0), "NFT contract not set");
        return ICertificateNFT(nftContract).getStudentCertificates(student);
    }
    
    //  Get the owner of a certificate (anyone)
    function getCertificateOwner(uint256 tokenId) public view returns (address) {
        require(nftContract != address(0), "NFT contract not set");
        return ICertificateNFT(nftContract).ownerOf(tokenId);
    }
}