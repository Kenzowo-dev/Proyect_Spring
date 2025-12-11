package com.panda_bobba.spring_bobba.repositories;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.panda_bobba.spring_bobba.model.Members_charges;
import com.panda_bobba.spring_bobba.model.MembersChargesId;
import com.panda_bobba.spring_bobba.DTO.MemberChargeDTO;

@Repository
public interface Members_chargesRepository extends JpaRepository<Members_charges, MembersChargesId> {

    @Query("""
        SELECT new com.panda_bobba.spring_bobba.DTO.MemberChargeDTO(
            m.name,
            c.name,
            c.description
        )
        FROM Members_charges mc
        JOIN mc.member m
        JOIN mc.charge c
    """)
    List<MemberChargeDTO> fetchMembersCharges();
}
