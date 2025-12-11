package com.panda_bobba.spring_bobba.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "members_charges")
public class Members_charges {

    @EmbeddedId
    private MembersChargesId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("memberId")
    @JoinColumn(name = "member_id")
    @NotNull(message = "El miembro no puede ser nulo")
    private MembersJPA member;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("chargeId")
    @JoinColumn(name = "charge_id")
    @NotNull(message = "El cargo no puede ser nulo")
    private ChargesJPA charge;

    public MembersChargesId getId() {
        return id;
    }

    public void setId(MembersChargesId id) {
        this.id = id;
    }

    public MembersJPA getMember() {
        return member;
    }

    public void setMember(MembersJPA member) {
        this.member = member;
    }

    public ChargesJPA getCharge() {
        return charge;
    }

    public void setCharge(ChargesJPA charge) {
        this.charge = charge;
    }
}
