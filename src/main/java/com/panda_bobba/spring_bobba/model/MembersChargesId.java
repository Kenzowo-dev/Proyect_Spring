package com.panda_bobba.spring_bobba.model;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;

@Embeddable
public class MembersChargesId implements Serializable {

    @NotNull(message = "El miembro no puede ser nulo")
    @Column(name = "member_id")
    private Long memberId;

    @NotNull(message = "El cargo no puede ser nulo")
    @Column(name = "charge_id")
    private Long chargeId;

    public MembersChargesId() {
    }

    public MembersChargesId(Long memberId, Long chargeId) {
        this.memberId = memberId;
        this.chargeId = chargeId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public Long getChargeId() {
        return chargeId;
    }

    public void setChargeId(Long chargeId) {
        this.chargeId = chargeId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof MembersChargesId))
            return false;
        MembersChargesId that = (MembersChargesId) o;
        return Objects.equals(memberId, that.memberId)
                && Objects.equals(chargeId, that.chargeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(memberId, chargeId);
    }
}
