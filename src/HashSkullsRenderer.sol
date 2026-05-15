// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "./lib/Base64.sol";

/**
 * @title HashSkullsRenderer
 * @notice Pure SVG + JSON renderer for HashSkulls. Deployed separately to
 *         keep the main contract under the 24 KB EIP-170 limit.
 */
contract HashSkullsRenderer {

    struct Traits {
        uint8 bodyColor;
        uint8 eyeType;
        uint8 crackPattern;
        uint8 toothType;
        uint8 bgColor;
        uint8 accessory;
        uint8 eyeGlow;
        uint8 rarity;
    }

    // -------------------------------------------------------------------------
    // Entry point
    // -------------------------------------------------------------------------

    function render(uint256 tokenId, bytes32 seed) external pure returns (string memory) {
        Traits memory t = _decodeTraits(seed);
        string memory svg  = _buildSVG(t);
        string memory json = _buildJSON(tokenId, t, svg);
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function decodeTraits(bytes32 seed) external pure returns (Traits memory) {
        return _decodeTraits(seed);
    }

    // -------------------------------------------------------------------------
    // Trait decoding
    // -------------------------------------------------------------------------

    function _decodeTraits(bytes32 seed) internal pure returns (Traits memory t) {
        t.bodyColor    = uint8(seed[0]) % 8;
        t.eyeType      = uint8(seed[1]) % 6;
        t.crackPattern = uint8(seed[2]) % 8;
        t.toothType    = uint8(seed[3]) % 4;
        t.bgColor      = uint8(seed[4]) % 8;
        uint8 acc      = uint8(seed[5]);
        t.accessory    = acc < 26 ? 2 : (acc < 51 ? 1 : 0);
        t.eyeGlow      = uint8(seed[6]) % 3;
        t.rarity       = _computeRarity(t);
    }

    function _computeRarity(Traits memory t) internal pure returns (uint8) {
        uint8 score = 0;
        if (t.accessory == 2) score += 4;
        else if (t.accessory == 1) score += 3;
        if (t.eyeType == 5) score += 3;
        else if (t.eyeType == 4) score += 2;
        if (t.bodyColor == 6) score += 2;
        if (t.crackPattern == 7) score += 3;
        else if (t.crackPattern == 6) score += 2;
        if (t.toothType == 1) score += 1;

        if (score >= 9) return 3;
        if (score >= 6) return 2;
        if (score >= 3) return 1;
        return 0;
    }

    // -------------------------------------------------------------------------
    // Name helpers
    // -------------------------------------------------------------------------

    function _bodyName(uint8 i) internal pure returns (string memory) {
        if (i == 0) return "Ivory";
        if (i == 1) return "Bone";
        if (i == 2) return "Jade";
        if (i == 3) return "Cerulean";
        if (i == 4) return "Amethyst";
        if (i == 5) return "Crimson";
        if (i == 6) return "Gold";
        return "Silver";
    }

    function _eyeName(uint8 e) internal pure returns (string memory) {
        if (e == 0) return "Hollow";
        if (e == 1) return "Glowing";
        if (e == 2) return "Crossed";
        if (e == 3) return "Spiral";
        if (e == 4) return "Heart";
        return "Star";
    }

    function _crackName(uint8 c) internal pure returns (string memory) {
        if (c == 0) return "Pristine";
        if (c == 1) return "Hairline";
        if (c == 2) return "Split";
        if (c == 3) return "Spiderweb";
        if (c == 4) return "Lightning";
        if (c == 5) return "Cross";
        if (c == 6) return "Shattered";
        return "Ancient";
    }

    function _toothName(uint8 t) internal pure returns (string memory) {
        if (t == 0) return "Serrated";
        if (t == 1) return "Fanged";
        if (t == 2) return "Grin";
        return "Jagged";
    }

    function _accessoryName(uint8 a) internal pure returns (string memory) {
        if (a == 1) return "Crown";
        if (a == 2) return "Hellfire";
        return "None";
    }

    function _glowName(uint8 g) internal pure returns (string memory) {
        if (g == 0) return "Blood";
        if (g == 1) return "Toxic";
        return "Arcane";
    }

    function _rarityName(uint8 r) internal pure returns (string memory) {
        if (r == 3) return "Mythic";
        if (r == 2) return "Legendary";
        if (r == 1) return "Rare";
        return "Common";
    }

    // -------------------------------------------------------------------------
    // Color helpers
    // -------------------------------------------------------------------------

    function _bodyColor(uint8 i) internal pure returns (string memory) {
        if (i == 0) return "#f0ede8";
        if (i == 1) return "#d4c5a9";
        if (i == 2) return "#8fbc8f";
        if (i == 3) return "#87ceeb";
        if (i == 4) return "#dda0dd";
        if (i == 5) return "#f08080";
        if (i == 6) return "#ffd700";
        return "#c0c0c0";
    }

    function _bodyShadow(uint8 i) internal pure returns (string memory) {
        if (i == 0) return "#c8c3bc";
        if (i == 1) return "#a89878";
        if (i == 2) return "#5a8a5a";
        if (i == 3) return "#5090b0";
        if (i == 4) return "#a060a0";
        if (i == 5) return "#b04040";
        if (i == 6) return "#b89000";
        return "#888888";
    }

    function _bgColor(uint8 i) internal pure returns (string memory) {
        if (i == 0) return "#ead7d1";
        if (i == 1) return "#d9e2f1";
        if (i == 2) return "#f6d8b8";
        if (i == 3) return "#d7ead4";
        if (i == 4) return "#ead8f3";
        if (i == 5) return "#e8e2d1";
        if (i == 6) return "#d5edf0";
        return "#eee6cf";
    }

    function _glowColor(uint8 g) internal pure returns (string memory) {
        if (g == 0) return "#ff2020";
        if (g == 1) return "#20ff60";
        return "#6040ff";
    }

    // -------------------------------------------------------------------------
    // SVG builder
    // -------------------------------------------------------------------------

    function _buildSVG(Traits memory t) internal pure returns (string memory) {
        string memory bg   = _bgColor(t.bgColor);
        string memory body = _bodyColor(t.bodyColor);
        string memory shadow = _bodyShadow(t.bodyColor);
        string memory glow = _glowColor(t.eyeGlow);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" shape-rendering="crispEdges">',
            '<defs><filter id="dp"><feDropShadow dx="6" dy="6" stdDeviation="0" flood-color="#000000" flood-opacity="0.65"/></filter></defs>',
            '<rect width="256" height="256" fill="', bg, '"/>',
            '<g filter="url(#dp)">',
            _renderSkullBody(body, shadow),
            _renderEyes(t.eyeType, glow),
            _renderTeeth(t.toothType, body),
            _renderCracks(t.crackPattern),
            '</g>',
            _renderAccessory(t.accessory),
            '</svg>'
        ));
    }

    function _px(uint8 col, uint8 row, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="', _u(uint256(col) * 16), '" y="', _u(uint256(row) * 16),
            '" width="16" height="16" fill="', color, '"/>'
        ));
    }

    function _rect(uint8 col, uint8 row, uint8 w, uint8 h, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="', _u(uint256(col) * 16), '" y="', _u(uint256(row) * 16),
            '" width="', _u(uint256(w) * 16), '" height="', _u(uint256(h) * 16),
            '" fill="', color, '"/>'
        ));
    }

    function _renderSkullBody(string memory c, string memory sh) internal pure returns (string memory) {
        string memory dark = "#0d0d10";
        string memory p1 = string(abi.encodePacked(
            _rect(5, 1, 6, 1, c), _rect(3, 2, 10, 1, c),
            _rect(2, 3, 12, 1, c), _rect(2, 4, 12, 1, c),
            _rect(2, 5, 12, 1, c), _rect(2, 6, 12, 1, c),
            _rect(2, 7, 12, 1, c), _rect(2, 8, 12, 1, c),
            _rect(2, 9, 3, 1, c), _rect(11, 9, 3, 1, c)
        ));
        string memory p2 = string(abi.encodePacked(
            _rect(2, 10, 3, 1, c), _rect(11, 10, 3, 1, c),
            _rect(5, 9, 6, 3, dark),
            _rect(3, 11, 2, 1, c), _rect(11, 11, 2, 1, c),
            _rect(2, 12, 12, 1, c), _rect(3, 13, 10, 1, dark),
            _rect(2, 3, 1, 8, sh), _rect(2, 12, 1, 1, sh),
            _px(13, 2, "#ffffff"), _px(14, 3, "#ffffff"), _rect(4, 1, 2, 1, "#ffffff")
        ));
        return string(abi.encodePacked(p1, p2));
    }

    function _renderEyes(uint8 eyeType, string memory glowColor) internal pure returns (string memory) {
        string memory dark = "#080808";
        if (eyeType == 0) {
            return string(abi.encodePacked(_rect(3, 6, 3, 3, dark), _rect(10, 6, 3, 3, dark)));
        }
        if (eyeType == 1) {
            return string(abi.encodePacked(_rect(3, 6, 3, 3, glowColor), _rect(10, 6, 3, 3, glowColor)));
        }
        if (eyeType == 2) {
            return string(abi.encodePacked(
                _rect(3, 6, 3, 3, dark), _rect(10, 6, 3, 3, dark),
                _px(3,6,glowColor), _px(5,6,glowColor), _px(4,7,glowColor),
                _px(3,8,glowColor), _px(5,8,glowColor),
                _px(10,6,glowColor), _px(12,6,glowColor), _px(11,7,glowColor),
                _px(10,8,glowColor), _px(12,8,glowColor)
            ));
        }
        if (eyeType == 3) {
            return string(abi.encodePacked(
                _rect(3, 6, 3, 3, dark), _rect(10, 6, 3, 3, dark),
                _px(3,6,glowColor),_px(4,6,glowColor),_px(5,6,glowColor),
                _px(5,7,glowColor),_px(4,8,glowColor),_px(3,8,glowColor),_px(4,7,"#ffffff"),
                _px(10,6,glowColor),_px(11,6,glowColor),_px(12,6,glowColor),
                _px(12,7,glowColor),_px(11,8,glowColor),_px(10,8,glowColor),_px(11,7,"#ffffff")
            ));
        }
        if (eyeType == 4) {
            return string(abi.encodePacked(
                _rect(3, 6, 3, 3, dark), _rect(10, 6, 3, 3, dark),
                _px(3,6,"#ff69b4"),_px(5,6,"#ff69b4"),
                _px(3,7,"#ff69b4"),_px(4,7,"#ff2060"),_px(5,7,"#ff69b4"),_px(4,8,"#ff69b4"),
                _px(10,6,"#ff69b4"),_px(12,6,"#ff69b4"),
                _px(10,7,"#ff69b4"),_px(11,7,"#ff2060"),_px(12,7,"#ff69b4"),_px(11,8,"#ff69b4")
            ));
        }
        return string(abi.encodePacked(
            _rect(3, 6, 3, 3, dark), _rect(10, 6, 3, 3, dark),
            _px(4,6,"#ffd700"),
            _px(3,7,"#ffd700"),_px(4,7,"#ffffff"),_px(5,7,"#ffd700"),_px(4,8,"#ffd700"),
            _px(11,6,"#ffd700"),
            _px(10,7,"#ffd700"),_px(11,7,"#ffffff"),_px(12,7,"#ffd700"),_px(11,8,"#ffd700")
        ));
    }

    function _renderTeeth(uint8 toothType, string memory c) internal pure returns (string memory) {
        string memory gap = "#0d0d10";
        if (toothType == 0) {
            return string(abi.encodePacked(
                _rect(4,14,2,2,c), _px(6,14,gap), _rect(7,14,2,2,c), _px(9,14,gap), _rect(10,14,2,2,c)
            ));
        }
        if (toothType == 1) {
            return string(abi.encodePacked(
                _rect(4,14,2,2,c), _rect(5,14,2,3,c), _rect(9,14,2,3,c), _rect(10,14,2,2,c)
            ));
        }
        if (toothType == 2) {
            return string(abi.encodePacked(_rect(4,14,8,1,c), _rect(4,15,8,1,c)));
        }
        return string(abi.encodePacked(
            _rect(4,14,8,1,c), _px(5,15,c), _px(7,15,c), _px(9,15,c), _px(11,15,c)
        ));
    }

    function _renderCracks(uint8 cp) internal pure returns (string memory) {
        string memory ck = "#2a2020";
        if (cp == 0) return "";
        if (cp == 1) return string(abi.encodePacked(
            _px(8,2,ck),_px(8,3,ck),_px(7,4,ck),_px(8,5,ck),_px(7,6,ck)
        ));
        if (cp == 2) return string(abi.encodePacked(
            _px(6,2,ck),_px(6,3,ck),_px(7,4,ck),_px(10,2,ck),_px(10,3,ck),_px(9,4,ck)
        ));
        if (cp == 3) return string(abi.encodePacked(
            _px(8,2,ck),_px(8,3,ck),_px(7,3,ck),_px(9,3,ck),
            _px(6,4,ck),_px(10,4,ck),_px(7,5,ck),_px(9,5,ck)
        ));
        if (cp == 4) return string(abi.encodePacked(
            _px(9,1,ck),_px(8,2,ck),_px(9,3,ck),_px(8,4,ck),_px(7,5,ck)
        ));
        if (cp == 5) return string(abi.encodePacked(
            _px(8,2,ck),_px(8,3,ck),_px(8,4,ck),
            _px(6,3,ck),_px(7,3,ck),_px(9,3,ck),_px(10,3,ck)
        ));
        if (cp == 6) {
            string memory a = string(abi.encodePacked(_px(7,2,ck),_px(9,2,ck),_px(6,3,ck),_px(8,3,ck),_px(10,3,ck)));
            string memory b = string(abi.encodePacked(_px(5,4,ck),_px(7,4,ck),_px(9,4,ck),_px(6,5,ck),_px(8,5,ck),_px(10,5,ck)));
            return string(abi.encodePacked(a, b));
        }
        return string(abi.encodePacked(
            _px(8,1,"#6b4800"),_px(7,2,"#6b4800"),_px(9,2,"#6b4800"),
            _px(6,3,"#6b4800"),_px(8,3,"#6b4800"),_px(10,3,"#6b4800"),
            _px(7,4,"#6b4800"),_px(9,4,"#6b4800"),_px(6,5,"#6b4800"),_px(8,5,"#6b4800")
        ));
    }

    function _renderAccessory(uint8 accessory) internal pure returns (string memory) {
        if (accessory == 0) return "";
        if (accessory == 1) {
            return string(abi.encodePacked(
                _rect(4, 0, 8, 1, "#ffd700"),
                _px(4,0,"#ffd700"),_px(6,0,"#ff4500"),_px(8,0,"#ffd700"),_px(10,0,"#ff4500"),
                _rect(3, 1, 2, 1, "#ffd700"), _rect(11,1, 2, 1, "#ffd700"),
                _rect(4, 1, 8, 1, "#e6b800")
            ));
        }
        return string(abi.encodePacked(
            _px(7,0,"#ff6600"), _px(8,0,"#ff6600"),
            _px(6,0,"#ff4400"), _px(9,0,"#ff4400"),
            _px(7,1,"#ffaa00"), _px(8,1,"#ffaa00"),
            _px(5,0,"#ff8800"), _px(10,0,"#ff8800"),
            _px(6,1,"#ffcc00"), _px(9,1,"#ffcc00")
        ));
    }

    // -------------------------------------------------------------------------
    // JSON builder
    // -------------------------------------------------------------------------

    function _buildJSON(uint256 tokenId, Traits memory t, string memory svg) internal pure returns (string memory) {
        string memory img = string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg))));
        string memory attrs = string(abi.encodePacked(
            '{"trait_type":"Rarity","value":"',     _rarityName(t.rarity),      '"},',
            '{"trait_type":"Body","value":"',       _bodyName(t.bodyColor),     '"},',
            '{"trait_type":"Eyes","value":"',       _eyeName(t.eyeType),        '"},',
            '{"trait_type":"Cracks","value":"',     _crackName(t.crackPattern), '"}'
        ));
        string memory attrs2 = string(abi.encodePacked(
            ',{"trait_type":"Teeth","value":"',      _toothName(t.toothType),    '"}',
            ',{"trait_type":"Accessory","value":"',  _accessoryName(t.accessory),'"}',
            ',{"trait_type":"Eye Glow","value":"',   _glowName(t.eyeGlow),       '"}'
        ));
        return string(abi.encodePacked(
            '{"name":"Skull #', _u(tokenId), '",',
            '"image":"', img, '",',
            '"attributes":[', attrs, attrs2, ']}'
        ));
    }

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------

    function _u(uint256 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        uint256 tmp = n; uint256 len;
        while (tmp != 0) { len++; tmp /= 10; }
        bytes memory buf = new bytes(len);
        while (n != 0) { buf[--len] = bytes1(uint8(48 + n % 10)); n /= 10; }
        return string(buf);
    }
}
