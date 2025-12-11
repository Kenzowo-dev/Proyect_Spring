package com.panda_bobba.spring_bobba.services;

import java.util.List;

import com.panda_bobba.spring_bobba.DTO.MemberChargeDTO;

public interface Members_chargesServices {
    List<MemberChargeDTO> fetchMembersCharges();
}
