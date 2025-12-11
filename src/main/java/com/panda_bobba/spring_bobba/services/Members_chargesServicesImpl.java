package com.panda_bobba.spring_bobba.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.panda_bobba.spring_bobba.DTO.MemberChargeDTO;
import com.panda_bobba.spring_bobba.repositories.Members_chargesRepository;


@Service
public class Members_chargesServicesImpl implements Members_chargesServices {

    @Autowired
    private Members_chargesRepository membersChargesRepository;

    @Transactional(readOnly = true)
    @Override
    public List<MemberChargeDTO> fetchMembersCharges() {
        return membersChargesRepository.fetchMembersCharges();
    }
}
