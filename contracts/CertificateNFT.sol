// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CertificateNFT is ERC721, Ownable {
    uint256 public tokenCounter;
    
    struct CertificateInfo {
        string studentName;
        string course;
        string grade;
        uint256 issueDate;
        string ipfsHash;
        bool isValid;
    }
    
    mapping(uint256 => CertificateInfo) public certificateInfo;
    mapping(address => uint256[]) public studentCertificates;
    
    event CertificateMinted(uint256 indexed tokenId, address indexed student, string course);
    event CertificateVerified(uint256 indexed tokenId, address indexed verifier);
    event CertificateRevoked(uint256 indexed tokenId);
    
    constructor() ERC721("PolytechnicCertificate", "POLYCERT") Ownable(msg.sender) {
        tokenCounter = 0;
    }
    
    function issueCertificate(
        address student,
        string memory studentName,
        string memory course,
        string memory grade,
        string memory ipfsHash
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = tokenCounter;
        tokenCounter++;
        
        _safeMint(student, tokenId);
        
        certificateInfo[tokenId] = CertificateInfo({
            studentName: studentName,
            course: course,
            grade: grade,
            issueDate: block.timestamp,
            ipfsHash: ipfsHash,
            isValid: true
        });
        
        studentCertificates[student].push(tokenId);
        
        emit CertificateMinted(tokenId, student, course);
        return tokenId;
    }
    
    function getCertificate(uint256 tokenId) public view returns (
        string memory studentName,
        string memory course,
        string memory grade,
        uint256 issueDate,
        string memory ipfsHash,
        bool isValid,
        address owner
    ) {
        require(tokenId < tokenCounter, "Certificate does not exist");
        CertificateInfo memory info = certificateInfo[tokenId];
        return (
            info.studentName,
            info.course,
            info.grade,
            info.issueDate,
            info.ipfsHash,
            info.isValid,
            ownerOf(tokenId)
        );
    }
    
    function verifyCertificate(uint256 tokenId) public {
        require(tokenId < tokenCounter, "Certificate does not exist");
        require(certificateInfo[tokenId].isValid, "Certificate has been revoked");
        emit CertificateVerified(tokenId, msg.sender);
    }
    
    function revokeCertificate(uint256 tokenId) public onlyOwner {
        require(tokenId < tokenCounter, "Certificate does not exist");
        require(certificateInfo[tokenId].isValid, "Certificate already revoked");
        certificateInfo[tokenId].isValid = false;
        emit CertificateRevoked(tokenId);
    }
    
    function getStudentCertificates(address student) public view returns (uint256[] memory) {
        return studentCertificates[student];
    }
    
    function getTotalCertificates() public view returns (uint256) {
        return tokenCounter;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < tokenCounter, "Certificate does not exist");
        CertificateInfo memory info = certificateInfo[tokenId];
        
        return string(abi.encodePacked(
            "data:application/json;utf8,",
            "{",
                '"name": "Certificate #', Strings.toString(tokenId), '",',
                '"description": "Academic Certificate from Polytechnic",',
                '"attributes": [',
                    '{ "trait_type": "Student", "value": "', info.studentName, '" },',
                    '{ "trait_type": "Course", "value": "', info.course, '" },',
                    '{ "trait_type": "Grade", "value": "', info.grade, '" },',
                    '{ "trait_type": "Issue Date", "value": "', Strings.toString(info.issueDate), '" }',
                '],',
                '"image": "ipfs://', info.ipfsHash, '"',
            "}"
        ));
    }
}